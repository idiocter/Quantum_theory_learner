"""Lexical retrieval (Postgres full-text search) for the tutor's RAG step.

Surfaces the most relevant seeded course material for a student's question so
the answer is grounded in the actual concept content rather than only the
model's parametric knowledge. Uses Postgres full-text ranking — no embeddings,
no vector store, no extra services — which is more than enough for a knowledge
base of this size.
"""
import logging

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import Error as DatabaseError

logger = logging.getLogger(__name__)

# Title/summary are the strongest signal, then the explanation, then derivation.
_SEARCH_VECTOR = (
    SearchVector("concept__title", weight="A")
    + SearchVector("concept__summary", weight="A")
    + SearchVector("explanation", weight="B")
    + SearchVector("math_derivation", weight="C")
)


def retrieve_context(query: str, limit: int = 3, min_rank: float = 0.01) -> list[str]:
    """Return up to ``limit`` formatted passages most relevant to ``query``.

    Returns an empty list on a blank query or any DB/search error — retrieval is
    best-effort and must never break answer generation.
    """
    query = (query or "").strip()
    if not query:
        return []

    from apps.concepts.models import ConceptContent

    search_query = SearchQuery(query, search_type="websearch")
    try:
        results = list(
            ConceptContent.objects.select_related("concept")
            .annotate(rank=SearchRank(_SEARCH_VECTOR, search_query))
            .filter(rank__gte=min_rank)
            .order_by("-rank")[:limit]
        )
    except DatabaseError as exc:
        logger.warning("RAG retrieval failed; continuing without context: %s", exc)
        return []

    return [_format_passage(c) for c in results]


def _format_passage(content) -> str:
    parts = [f"### {content.concept.title} ({content.level})", content.explanation.strip()]
    if content.math_derivation:
        parts.append(f"Derivation: {content.math_derivation.strip()}")
    equations = [e.get("latex", "") for e in (content.key_equations or []) if e.get("latex")]
    if equations:
        parts.append("Key equations: " + "; ".join(equations))
    return "\n".join(parts)
