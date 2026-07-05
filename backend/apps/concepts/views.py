from django.contrib.postgres.search import SearchQuery, SearchRank
from django.core.cache import cache
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control, cache_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Concept, Formula, GlossaryTerm, UserTopicProgress
from .serializers import (
    BranchSerializer,
    ConceptDetailSerializer,
    ConceptListSerializer,
    ConceptSearchResultSerializer,
    FormulaIndexSerializer,
    GlossaryTermSerializer,
    KnowledgeGraphSerializer,
    LessonUnlockSerializer,
    TopicProgressSerializer,
)


@method_decorator(cache_page(300), name="dispatch")
class BranchListView(generics.ListAPIView):
    """All branches with their published-topic counts (cached 5 min)."""

    serializer_class = BranchSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # only 8 branches — return them all as a flat list

    def get_queryset(self):
        return Category.objects.annotate(
            topic_count=Count("concepts", filter=Q(concepts__is_published=True))
        ).order_by("order")


# Server-side cache (skips the DB entirely on repeat requests) + browser/CDNControl header. cache_page
# Cache- keys on the full URL, so each page / filter /
# search / ordering combination is cached independently for 5 minutes.
@method_decorator(cache_page(300), name="dispatch")
@method_decorator(cache_control(public=True, max_age=300), name="dispatch")
class ConceptListView(generics.ListAPIView):
    # Annotate the prerequisite count in the single list query instead of firing
    # one COUNT per row in the serializer (an N+1 that was ~20 extra round-trips
    # to the remote Neon DB per page).
    queryset = (
        Concept.objects.filter(is_published=True)
        .select_related("category")
        .annotate(prerequisites_count=Count("prerequisites", distinct=True))
    )
    serializer_class = ConceptListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["difficulty", "category__slug"]
    search_fields = ["title", "summary"]
    ordering_fields = ["order", "title", "view_count", "created_at"]
    ordering = ["order"]


@method_decorator(cache_control(public=True, max_age=300), name="dispatch")
class ConceptDetailView(generics.RetrieveAPIView):
    queryset = (
        Concept.objects.filter(is_published=True)
        .select_related("category")
        .prefetch_related("contents", "formulas", "prerequisites", "unlocks")
    )
    serializer_class = ConceptDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count without triggering full save
        Concept.objects.filter(pk=instance.pk).update(view_count=F("view_count") + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ConceptSearchView(generics.ListAPIView):
    """Full-text topic search ranked by the stored Postgres `search_vector`.

    GET /search/?q=<query> — returns ranked, paginated topic hits with branch
    info. Empty/blank query returns an empty result set.
    """

    serializer_class = ConceptSearchResultSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self): # type: ignore
        query = (self.request.query_params.get("q") or "").strip()
        if not query:
            return Concept.objects.none()
        search_query = SearchQuery(query, search_type="websearch", config="english")
        return (
            Concept.objects.filter(is_published=True)
            .filter(search_vector=search_query)  # actual FTS match (WHERE vector @@ query)
            .select_related("category")
            .annotate(rank=SearchRank("search_vector", search_query))  # rank for ordering only
            .order_by("-rank", "order")
        )


@method_decorator(cache_page(60 * 10), name="dispatch")
class FormulaIndexView(generics.ListAPIView):
    """Site-wide formula index, searchable by LaTeX, description, or topic title."""

    queryset = (
        Formula.objects.select_related("concept", "concept__category")
        .filter(concept__is_published=True)
        .order_by("concept__title", "order")
    )
    serializer_class = FormulaIndexSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ["latex", "description", "concept__title"]


@method_decorator(cache_control(public=True, max_age=300), name="dispatch")
class GlossaryListView(generics.ListAPIView):
    """All glossary terms (flat list, cached). Powers the frontend linker.

    Optional `?concept=<slug>` filter returns only terms defined by that lesson.
    """

    serializer_class = GlossaryTermSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # small controlled vocabulary — return them all

    def get_queryset(self):
        qs = GlossaryTerm.objects.select_related("concept").order_by("slug")
        concept_slug = self.request.query_params.get("concept")
        if concept_slug:
            qs = qs.filter(concept__slug=concept_slug)
        return qs


@method_decorator(cache_control(public=True, max_age=300), name="dispatch")
class GlossaryDetailView(generics.RetrieveAPIView):
    """A single glossary term by slug."""

    queryset = GlossaryTerm.objects.select_related("concept")
    serializer_class = GlossaryTermSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"


class LessonUnlockView(APIView):
    """Server-side prerequisite enforcement.

    GET → per-lesson unlock status for the authenticated user, computed from
    `Concept.prerequisites` and the user's `UserTopicProgress` rows. A lesson
    unlocks once all of its prerequisite concepts have been visited. Optional
    `?category=<slug>` scopes the report to one branch (e.g. `qc-foundations`).

    This is the authoritative unlock oracle: the client must consult it rather
    than deciding unlock state itself, so gating cannot be bypassed by tampering
    with local state.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        concepts = (
            Concept.objects.filter(is_published=True)
            .select_related("category")
            .prefetch_related("prerequisites")
            .order_by("category__order", "order")
        )
        category = request.query_params.get("category")
        if category:
            concepts = concepts.filter(category__slug=category)

        visited = set(
            UserTopicProgress.objects.filter(user=request.user).values_list(
                "concept__slug", flat=True
            )
        )

        rows = []
        for c in concepts:
            prereqs = list(c.prerequisites.all())
            prereq_status = [
                {"slug": p.slug, "title": p.title, "visited": p.slug in visited}
                for p in prereqs
            ]
            missing = [p["slug"] for p in prereq_status if not p["visited"]]
            rows.append(
                {
                    "slug": c.slug,
                    "title": c.title,
                    "category_slug": c.category.slug if c.category else None,
                    "order": c.order,
                    "difficulty": c.difficulty,
                    "visited": c.slug in visited,
                    "unlocked": len(missing) == 0,
                    "prerequisites": prereq_status,
                    "missing_prerequisites": missing,
                }
            )

        return Response(LessonUnlockSerializer(rows, many=True).data)


class KnowledgeGraphView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cache_key = "knowledge_graph_v3"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        concepts = (
            Concept.objects.filter(is_published=True)
            .select_related("category")
            .prefetch_related("prerequisites")
        )
        data = KnowledgeGraphSerializer(None).to_representation({"concepts": concepts})
        cache.set(cache_key, data, timeout=300)
        return Response(data)


class ProgressView(APIView):
    """Per-user reading progress.

    GET  → {visited: [...], bookmarks: [...], completion: {branch: {...}}}
    POST → log a visit: {slug, time_spent_seconds}; upserts and accumulates time.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = (
            UserTopicProgress.objects.filter(user=request.user)
            .select_related("concept", "concept__category")
        )
        rows = list(rows)
        serialized = TopicProgressSerializer(rows, many=True).data

        # Per-branch completion: visited distinct concepts over published total.
        totals = {
            r["category__slug"]: {
                "name": r["category__name"],
                "color": r["category__color"],
                "total": r["total"],
                "visited": 0,
            }
            for r in (
                Concept.objects.filter(is_published=True, category__isnull=False)
                .values("category__slug", "category__name", "category__color")
                .annotate(total=Count("id"))
            )
        }
        for row in rows:
            cat = row.concept.category
            if cat and cat.slug in totals:
                totals[cat.slug]["visited"] += 1
        completion = {
            slug: {
                **info,
                "percent": round(100 * info["visited"] / info["total"]) if info["total"] else 0,
            }
            for slug, info in totals.items()
        }

        return Response(
            {
                "visited": serialized,
                "bookmarks": [s for s in serialized if s["bookmarked"]],
                "completion": completion,
            }
        )

    def post(self, request):
        slug = request.data.get("slug") or request.data.get("concept_slug") or request.data.get("topic_slug")
        concept = get_object_or_404(Concept, slug=slug, is_published=True)
        try:
            secs = max(0, int(request.data.get("time_spent_seconds", 0) or 0))
        except (TypeError, ValueError):
            secs = 0

        obj, _ = UserTopicProgress.objects.get_or_create(user=request.user, concept=concept)
        obj.time_spent_seconds = F("time_spent_seconds") + secs
        obj.visited_at = timezone.now()
        obj.save(update_fields=["time_spent_seconds", "visited_at"])
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class BookmarkToggleView(APIView):
    """PATCH /concepts/<slug>/bookmark/ — toggle the bookmark for a topic."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, slug):
        concept = get_object_or_404(Concept, slug=slug, is_published=True)
        obj, _ = UserTopicProgress.objects.get_or_create(user=request.user, concept=concept)
        obj.bookmarked = not obj.bookmarked
        obj.save(update_fields=["bookmarked"])
        return Response({"slug": slug, "bookmarked": obj.bookmarked})


@method_decorator(cache_page(60 * 60), name="dispatch")
class SitemapView(APIView):
    """XML sitemap of all published topic pages (cached 1h). SEO.

    Absolute URLs are built from the request host so the same view works behind
    Nginx in production and on localhost in dev.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        base = f"{request.scheme}://{request.get_host()}"
        rows = (
            Concept.objects.filter(is_published=True)
            .values_list("slug", "updated_at")
            .order_by("slug")
        )
        urls = [f"{base}/concepts/{slug}" for slug, _ in rows]
        lastmods = {slug: updated for slug, updated in rows}

        parts = ['<?xml version="1.0" encoding="UTF-8"?>',
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        # Static top-level pages.
        for path in ["", "/concepts", "/knowledge-graph", "/formulas", "/simulations"]:
            parts.append(f"<url><loc>{base}{path}</loc></url>")
        for slug, updated in lastmods.items():
            lm = updated.date().isoformat() if updated else ""
            parts.append(f"<url><loc>{base}/concepts/{slug}</loc><lastmod>{lm}</lastmod></url>")
        parts.append("</urlset>")
        from django.http import HttpResponse

        return HttpResponse("".join(parts), content_type="application/xml")
