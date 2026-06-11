from django.urls import path

from .views import CategoryListView, ConceptDetailView, ConceptListView, KnowledgeGraphView

urlpatterns = [
    path("", ConceptListView.as_view(), name="concept-list"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("graph/", KnowledgeGraphView.as_view(), name="knowledge-graph"),
    path("<slug:slug>/", ConceptDetailView.as_view(), name="concept-detail"),
]
