from django.core.cache import cache
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdminUser, IsAuthenticatedOrReadOnly

from .models import Category, Concept
from .serializers import (
    CategorySerializer,
    ConceptDetailSerializer,
    ConceptListSerializer,
    KnowledgeGraphSerializer,
)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


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
    queryset = Concept.objects.filter(is_published=True).select_related("category").prefetch_related("contents", "prerequisites", "unlocks")
    serializer_class = ConceptDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count without triggering full save
        Concept.objects.filter(pk=instance.pk).update(view_count=F("view_count") + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


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
