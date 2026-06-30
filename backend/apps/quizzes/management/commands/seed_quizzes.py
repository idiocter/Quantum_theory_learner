"""Generate a multiple-choice quiz per concept using the existing Groq LLM
layer, grounded in the concept's own content + formulas, and store it.

The quiz API and frontend were built long ago but no quiz content was ever
seeded — this fills that gap. Idempotent: one Quiz per concept; re-running skips
concepts that already have a quiz unless --force is given.

    venv/bin/python manage.py seed_quizzes                 # all published topics
    venv/bin/python manage.py seed_quizzes --limit 3       # try a few first
    venv/bin/python manage.py seed_quizzes --branch atomic --force
    venv/bin/python manage.py seed_quizzes --questions 5

Requires GROQ_API_KEY (or the configured LLM provider). Each topic is one LLM
call; failures are logged and skipped so one bad topic never aborts the run.
"""
import json
import re
import time

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.ai_tutor.llm import LLMError, generate_chat
from apps.concepts.models import Concept
from apps.quizzes.models import Question, Quiz

OPTION_IDS = ["a", "b", "c", "d", "e", "f"]

SYSTEM_PROMPT = (
    "You are a quantum-physics exam author. Given study material on one topic, write rigorous, "
    "unambiguous multiple-choice questions that test genuine understanding (not trivia). "
    "Each question has exactly one correct option and three plausible distractors. ALWAYS wrap every "
    "formula, equation, or mathematical symbol in inline LaTeX math delimiters, e.g. $d\\sin\\theta = "
    "\\frac{m\\lambda}{2}$ and $\\hbar$ — never write bare LaTeX without the surrounding $...$. Do NOT "
    "reference 'the text' or 'the passage' — questions must stand alone.\n\n"
    "Respond with ONLY a JSON object of this exact shape, no prose, no code fences:\n"
    '{"questions": [{"question": "...", "options": ["...", "...", "...", "..."], '
    '"answer": 0, "explanation": "why the correct option is right"}]}\n'
    '"answer" is the 0-based index of the correct option.'
)


def _extract_json(text: str) -> dict:
    """Pull the first JSON object out of an LLM response, tolerating code fences
    and the LaTeX backslashes the model emits inside strings (e.g. ``\\kappa``),
    which are invalid JSON escapes."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text).rsplit("```", 1)[0]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found in response")
    blob = text[start : end + 1]
    try:
        return json.loads(blob)
    except json.JSONDecodeError:
        # The model emits LaTeX backslashes inside strings (\frac, \nu, \uparrow)
        # that collide with JSON's escapes. Double every backslash except the
        # ones before a quote (the only escape we must keep structural), forcing
        # all LaTeX backslashes literal so KaTeX renders them correctly.
        return json.loads(re.sub(r'\\(?!")', r"\\\\", blob))


def _build_user_prompt(concept: Concept, n: int) -> str:
    parts = [
        f"Topic: {concept.title}",
        f"Difficulty level: {concept.difficulty}",
        f"Summary: {concept.summary}",
    ]
    content = concept.contents.first()
    if content and content.explanation:
        parts.append("Explanation:\n" + content.explanation.strip()[:1500])
    formulas = list(concept.formulas.all())
    if formulas:
        parts.append("Key formulas:")
        for f in formulas:
            line = f.latex.strip()
            if f.description:
                line += f" — {f.description.strip()}"
            parts.append(f"- {line}")
    parts.append(
        f"\nWrite {n} multiple-choice questions at the {concept.difficulty} level testing "
        f"understanding of this topic. Return the JSON object only."
    )
    return "\n".join(parts)


class Command(BaseCommand):
    help = "Generate and store an MCQ quiz per concept via the Groq LLM layer."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=0, help="Only process the first N concepts (0 = all).")
        parser.add_argument("--branch", type=str, default="", help="Restrict to one branch slug.")
        parser.add_argument("--slugs", type=str, default="", help="Comma-separated concept slugs to restrict to.")
        parser.add_argument("--questions", type=int, default=4, help="Questions per quiz (default 4).")
        parser.add_argument("--force", action="store_true", help="Regenerate quizzes for concepts that already have one.")
        parser.add_argument("--sleep", type=float, default=0.0, help="Seconds to sleep between LLM calls.")

    def handle(self, *args, **opts):
        n = max(1, opts["questions"])
        concepts = Concept.objects.filter(is_published=True).select_related("category").prefetch_related(
            "contents", "formulas"
        ).order_by("category__order", "order")
        if opts["branch"]:
            concepts = concepts.filter(category__slug=opts["branch"])
        if opts["slugs"]:
            wanted = {s.strip() for s in opts["slugs"].split(",") if s.strip()}
            concepts = concepts.filter(slug__in=wanted)
        concepts = list(concepts)
        if opts["limit"]:
            concepts = concepts[: opts["limit"]]

        created = skipped = failed = 0
        for i, concept in enumerate(concepts, 1):
            if Quiz.objects.filter(concept=concept).exists() and not opts["force"]:
                skipped += 1
                continue

            self.stdout.write(f"[{i}/{len(concepts)}] {concept.slug} … ", ending="")
            self.stdout.flush()
            try:
                resp = self._call_llm(concept, n)
                questions = self._parse_questions(resp.text, n)
            except LLMError as exc:
                msg = str(exc).lower()
                # A real auth/config error hits every topic — stop early. Rate
                # limits are handled by _call_llm's backoff before we get here.
                if any(k in msg for k in ("api key", "not configured", "401", "unauthor", "unknown llm_provider")):
                    self.stderr.write(self.style.ERROR(f"\nLLM config error ({exc}). Aborting; check GROQ_API_KEY/provider."))
                    raise SystemExit(1)
                self.stdout.write(self.style.WARNING(f"skip (LLM error: {exc})"))
                failed += 1
                continue
            except Exception as exc:  # parsing / validation
                self.stdout.write(self.style.WARNING(f"skip (bad output: {exc})"))
                failed += 1
                continue

            self._save_quiz(concept, questions, force=opts["force"])
            created += 1
            self.stdout.write(self.style.SUCCESS(f"{len(questions)} Qs"))
            if opts["sleep"]:
                time.sleep(opts["sleep"])

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {created} quiz(zes) created, {skipped} skipped (existing), {failed} failed."
            )
        )

    def _call_llm(self, concept: Concept, n: int):
        """Call the LLM, backing off and retrying on rate-limit errors."""
        prompt = [{"role": "user", "content": _build_user_prompt(concept, n)}]
        for attempt in range(4):
            try:
                return generate_chat(SYSTEM_PROMPT, prompt, max_tokens=1800)
            except LLMError as exc:
                msg = str(exc).lower()
                if ("rate" in msg or "429" in msg) and attempt < 3:
                    wait = 20 * (attempt + 1)
                    self.stdout.write(self.style.WARNING(f"rate-limited, waiting {wait}s… "), ending="")
                    self.stdout.flush()
                    time.sleep(wait)
                    continue
                raise

    def _parse_questions(self, text: str, n: int) -> list[dict]:
        data = _extract_json(text)
        raw = data.get("questions") or []
        out = []
        for q in raw:
            text_q = (q.get("question") or "").strip()
            options = [str(o).strip() for o in (q.get("options") or []) if str(o).strip()]
            answer = q.get("answer")
            if not text_q or len(options) < 2 or not isinstance(answer, int):
                continue
            if not (0 <= answer < len(options)) or len(options) > len(OPTION_IDS):
                continue
            out.append({"text": text_q, "options": options, "answer": answer, "explanation": (q.get("explanation") or "").strip()})
        if not out:
            raise ValueError("no valid questions parsed")
        return out[:n]

    @transaction.atomic
    def _save_quiz(self, concept: Concept, questions: list[dict], force: bool):
        if force:
            Quiz.objects.filter(concept=concept).delete()
        quiz = Quiz.objects.create(
            title=f"{concept.title} — Quiz",
            concept=concept,
            difficulty=concept.difficulty,
            description=f"Test your understanding of {concept.title}.",
            time_limit_minutes=max(5, len(questions) * 2),
            is_published=True,
        )
        for order, q in enumerate(questions):
            options = [
                {"id": OPTION_IDS[idx], "text": opt, "is_correct": idx == q["answer"]}
                for idx, opt in enumerate(q["options"])
            ]
            Question.objects.create(
                quiz=quiz,
                question_type="mcq",
                text=q["text"],
                explanation=q["explanation"],
                points=1,
                order=order,
                options=options,
            )
