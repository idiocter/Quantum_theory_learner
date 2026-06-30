from django.contrib.postgres.search import SearchQuery, SearchRank
from django.core.cache import cache
from django.db.models import Count, F, Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Concept, Formula
from .serializers import (
    BranchSerializer,
    ConceptDetailSerializer,
    ConceptListSerializer,
    ConceptSearchResultSerializer,
    FormulaIndexSerializer,
    KnowledgeGraphSerializer,
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


class ConceptListView(generics.ListAPIView):
    queryset = Concept.objects.filter(is_published=True).select_related("category")
    serializer_class = ConceptListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["difficulty", "category__slug"]
    search_fields = ["title", "summary"]
    ordering_fields = ["order", "title", "view_count", "created_at"]
    ordering = ["order"]


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

    def get_queryset(self):
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


class KnowledgeGraphView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cache_key = "knowledge_graph_v2"
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
