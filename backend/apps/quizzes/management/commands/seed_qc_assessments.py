"""Seed the Quantum Computing track's objective-tagged assessments.

Reads the human-reviewable question banks at
``docs/quantum-computing/assessments/<module>.json`` and creates one Quiz per
lesson Concept (linked via the ``concept`` FK), with one Question per learning
objective. Unlike ``seed_quizzes`` (which uses the LLM to author generic MCQs),
this command loads hand-authored, objective-tagged items whose grading matches
apps.quizzes.views exactly:

  * mcq / true_false -> ``options`` = [{"id","text","is_correct"}, ...] with
    exactly one correct; the grader lowercases the submitted answer and compares
    it to the correct option's id.
  * numerical        -> ``correct_numerical`` + ``numerical_tolerance``
    (fractional): |ans - correct| <= |correct| * tolerance.

Idempotent + non-clobbering: QC assessment quizzes use the distinct title suffix
"- Assessment"/"- Diagnostic" from the banks, so they never collide with the
LLM-authored "<title> — Quiz" quizzes. Each run re-syncs questions from the bank
(delete + recreate the questions of the matched quiz) so the JSON stays the
single source of truth. Physics-track quizzes (different concepts, different
titles) are untouched.

    venv/bin/python manage.py seed_qc_assessments
    venv/bin/python manage.py seed_qc_assessments --modules module-0
    venv/bin/python manage.py seed_qc_assessments --check      # validate only
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.concepts.models import Concept
from apps.quizzes.models import Question, Quiz

# Repo root is two levels above BASE_DIR (BASE_DIR == .../backend).
DOCS_DIR = Path(settings.BASE_DIR).parent / "docs" / "quantum-computing" / "assessments"
MODULE_FILES = {
    "module-0": DOCS_DIR / "module-0.json",
    "module-1": DOCS_DIR / "module-1.json",
    "module-2": DOCS_DIR / "module-2.json",
    "module-3": DOCS_DIR / "module-3.json",
}
VALID_TYPES = {"mcq", "numerical", "true_false"}


class Command(BaseCommand):
    help = "Create objective-tagged QC assessment quizzes from the docs question banks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--modules",
            type=str,
            default="",
            help="Comma-separated module ids to seed (default: all). e.g. module-0,module-1",
        )
        parser.add_argument(
            "--check",
            action="store_true",
            help="Validate the banks (schema, one-correct-per-MCQ, objective coverage) without writing.",
        )

    def handle(self, *args, **opts):
        wanted = {m.strip() for m in opts["modules"].split(",") if m.strip()} or set(MODULE_FILES)

        total_quizzes = total_questions = 0
        errors: list[str] = []

        for module_id in sorted(wanted):
            path = MODULE_FILES.get(module_id)
            if not path:
                errors.append(f"Unknown module '{module_id}'")
                continue
            if not path.exists():
                errors.append(f"Bank not found: {path}")
                continue

            bank = json.loads(path.read_text())
            self.stdout.write(self.style.MIGRATE_HEADING(f"\n{module_id}: {bank.get('title', '')}"))

            for spec in bank.get("quizzes", []):
                errs = self._validate_quiz(spec)
                if errs:
                    errors.extend(f"[{module_id}/{spec.get('concept_slug')}] {e}" for e in errs)
                    continue

                concept = Concept.objects.filter(slug=spec["concept_slug"]).first()
                if concept is None:
                    errors.append(
                        f"[{module_id}] concept '{spec['concept_slug']}' not found — run seed_concepts first"
                    )
                    continue

                nq = len(spec["questions"])
                if opts["check"]:
                    self.stdout.write(f"  OK  {spec['concept_slug']}: {nq} item(s) validated")
                    total_quizzes += 1
                    total_questions += nq
                    continue

                self._save_quiz(concept, spec)
                total_quizzes += 1
                total_questions += nq
                self.stdout.write(
                    self.style.SUCCESS(f"  seeded {spec['concept_slug']}: {nq} item(s)")
                )

        self.stdout.write("")
        verb = "validated" if opts["check"] else "seeded"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} {total_quizzes} quiz(zes), {total_questions} question(s)."
            )
        )
        if errors:
            self.stdout.write(self.style.ERROR(f"\n{len(errors)} problem(s):"))
            for e in errors:
                self.stdout.write(self.style.ERROR(f"  - {e}"))
            raise SystemExit(1)

    # -- validation ---------------------------------------------------------
    def _validate_quiz(self, spec: dict) -> list[str]:
        errs: list[str] = []
        if not spec.get("concept_slug"):
            errs.append("missing concept_slug")
        if not spec.get("quiz_title"):
            errs.append("missing quiz_title")
        questions = spec.get("questions") or []
        if not questions:
            errs.append("no questions")
        seen_objectives: set[str] = set()
        for i, q in enumerate(questions):
            tag = q.get("objective_id") or f"#{i}"
            if not q.get("objective_id"):
                errs.append(f"question {i}: missing objective_id")
            elif q["objective_id"] in seen_objectives:
                errs.append(f"duplicate objective_id {q['objective_id']} (1:1 mapping required)")
            else:
                seen_objectives.add(q["objective_id"])

            qtype = q.get("question_type")
            if qtype not in VALID_TYPES:
                errs.append(f"{tag}: invalid question_type '{qtype}'")
                continue
            if not (q.get("text") or "").strip():
                errs.append(f"{tag}: empty text")

            if qtype in ("mcq", "true_false"):
                opts = q.get("options") or []
                if len(opts) < 2:
                    errs.append(f"{tag}: needs >= 2 options")
                correct = [o for o in opts if o.get("is_correct")]
                if len(correct) != 1:
                    errs.append(f"{tag}: must have exactly one correct option (found {len(correct)})")
                ids = [str(o.get("id", "")).lower() for o in opts]
                if len(set(ids)) != len(ids):
                    errs.append(f"{tag}: duplicate option ids")
                if qtype == "true_false" and set(ids) - {"true", "false"}:
                    errs.append(f"{tag}: true_false option ids must be 'true'/'false'")
            elif qtype == "numerical":
                cn = q.get("correct_numerical")
                if cn is None:
                    errs.append(f"{tag}: numerical needs correct_numerical")
                elif cn == 0:
                    errs.append(f"{tag}: correct_numerical == 0 is ungradable (tolerance*0 = 0)")
                if not q.get("numerical_tolerance"):
                    errs.append(f"{tag}: numerical needs a non-zero numerical_tolerance")
        return errs

    # -- persistence --------------------------------------------------------
    @transaction.atomic
    def _save_quiz(self, concept: Concept, spec: dict):
        quiz, _ = Quiz.objects.update_or_create(
            concept=concept,
            title=spec["quiz_title"],
            defaults={
                "difficulty": spec.get("difficulty", concept.difficulty),
                "description": spec.get("description", ""),
                "time_limit_minutes": max(5, len(spec["questions"]) * 2),
                "is_published": True,
            },
        )
        # Re-sync questions from the bank (banks are the source of truth).
        quiz.questions.all().delete()
        for order, q in enumerate(spec["questions"]):
            qtype = q["question_type"]
            fields = dict(
                quiz=quiz,
                question_type=qtype,
                text=q["text"],
                hint=q.get("hint", ""),
                explanation=q.get("explanation", ""),
                points=q.get("points", 1),
                order=order,
            )
            if qtype in ("mcq", "true_false"):
                fields["options"] = q["options"]
            elif qtype == "numerical":
                fields["correct_numerical"] = q["correct_numerical"]
                fields["numerical_tolerance"] = q["numerical_tolerance"]
            Question.objects.create(**fields)
