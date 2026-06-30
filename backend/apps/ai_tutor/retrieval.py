"""Lexical retrieval (Postgres full-text search) for the tutor's RAG step.

Ranks topics against the student's question using the stored, GIN-indexed
`Concept.search_vector` (maintained by a signal in the concepts app), then
returns formatted passages — each topic's explanation plus its formulas — so the
tutor grounds its answer in the actual course content. No embeddings, no vector
store; plenty for a knowledge base of this size.
"""
import logging

from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db import Error as DatabaseError

logger = logging.getLogger(__name__)


def retrieve_context(query: str, limit: int = 3, min_rank: float = 0.01) -> list[str]:
    """Return up to ``limit`` formatted passages most relevant to ``query``.

    Returns an empty list on a blank query or any DB/search error — retrieval is
    best-effort and must never break answer generation.
    """
    query = (query or "").strip()
    if not query:
        return []

    from apps.concepts.models import Concept

    search_query = SearchQuery(query, search_type="websearch")
    try:
        concepts = list(
            Concept.objects.filter(is_published=True)
            .annotate(rank=SearchRank("search_vector", search_query))
            .filter(rank__gte=min_rank)
            .order_by("-rank")
            .prefetch_related("contents", "formulas")[:limit]
        )
    except DatabaseError as exc:
        logger.warning("RAG retrieval failed; continuing without context: %s", exc)
        return []

    return [_format_passage(c) for c in concepts]


def _format_passage(concept) -> str:
    parts = [f"### {concept.title}", concept.summary.strip()]
    content = concept.contents.first()
    if content and content.explanation:
        parts.append(content.explanation.strip())
        if content.math_derivation:
            parts.append(f"Derivation: {content.math_derivation.strip()}")
    formulas = [f.latex for f in concept.formulas.all() if f.latex]
    if formulas:
        parts.append("Key formulas: " + "; ".join(formulas))
    return "\n".join(parts)
