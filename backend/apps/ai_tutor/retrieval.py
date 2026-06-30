"""Lexical retrieval (Postgres full-text search) for the tutor's RAG step.

Ranks topics against the student's question using the stored, GIN-indexed
`Concept.search_vector` (maintained by a signal in the concepts app), then
returns formatted passages — each topic's explanation plus its formulas (with
descriptions and symbol legends) — so the tutor grounds its answer in the
actual course content. No embeddings, no vector store; plenty for a knowledge
base of this size.

When the conversation is anchored to a topic, that topic's passage is always
placed first (regardless of the question ranking) so the tutor can cite the
exact formulas the student is looking at.
"""
import logging

from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db import Error as DatabaseError

logger = logging.getLogger(__name__)


def retrieve_context(query: str, limit: int = 3, anchor=None) -> list[str]:
    """Return up to ``limit`` formatted passages for the student's question.

    ``anchor`` is the current topic's ``Concept`` (or ``None``). When given, its
    passage is returned first and the remaining slots are filled with the
    highest-ranked topics for ``query``. Returns an empty list on a blank query
    with no anchor, or degrades gracefully on any DB/search error — retrieval is
    best-effort and must never break answer generation.
    """
    from apps.concepts.models import Concept

    passages: list[str] = []
    seen: set = set()

    # Always lead with the topic the student is actually studying.
    if anchor is not None:
        try:
            passages.append(_format_passage(anchor))
            seen.add(anchor.pk)
        except DatabaseError as exc:  # pragma: no cover - defensive
            logger.warning("RAG anchor formatting failed: %s", exc)

    query = (query or "").strip()
    remaining = limit - len(passages)
    if query and remaining > 0:
        search_query = SearchQuery(query, search_type="websearch", config="english")
        try:
            concepts = list(
                Concept.objects.filter(is_published=True)
                .filter(search_vector=search_query)  # actual FTS match, not a rank threshold
                .exclude(pk__in=seen)
                .annotate(rank=SearchRank("search_vector", search_query))
                .order_by("-rank")
                .prefetch_related("contents", "formulas")[:remaining]
            )
        except DatabaseError as exc:
            logger.warning("RAG retrieval failed; continuing without ranked context: %s", exc)
            concepts = []
        passages.extend(_format_passage(c) for c in concepts)

    return passages


def _format_passage(concept) -> str:
    parts = [f"### {concept.title}", concept.summary.strip()]
    content = concept.contents.first()
    if content and content.explanation:
        parts.append(content.explanation.strip())
        if content.math_derivation:
            parts.append(f"Derivation: {content.math_derivation.strip()}")

    formula_lines = []
    for f in concept.formulas.all():
        if not f.latex:
            continue
        line = f.latex.strip()
        if f.description:
            line += f" — {f.description.strip()}"
        if f.symbols:
            syms = "; ".join(f"{k} = {v}" for k, v in f.symbols.items())
            line += f"  (where {syms})"
        formula_lines.append(f"- {line}")
    if formula_lines:
        parts.append("Key formulas (cite these verbatim where relevant):\n" + "\n".join(formula_lines))

    return "\n".join(parts)
