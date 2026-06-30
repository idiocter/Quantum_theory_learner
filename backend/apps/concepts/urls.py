from django.urls import path

from .views import (
    BranchListView,
    ConceptDetailView,
    ConceptListView,
    ConceptSearchView,
    FormulaIndexView,
    KnowledgeGraphView,
)

# NOTE: the specific paths must precede the catch-all `<slug:slug>/`, or a slug
# would swallow "search", "formulas", etc.
urlpatterns = [
    path("", ConceptListView.as_view(), name="concept-list"),
    path("categories/", BranchListView.as_view(), name="category-list"),
    path("branches/", BranchListView.as_view(), name="branch-list"),
    path("graph/", KnowledgeGraphView.as_view(), name="knowledge-graph"),
    path("search/", ConceptSearchView.as_view(), name="concept-search"),
    path("formulas/", FormulaIndexView.as_view(), name="formula-index"),
    path("<slug:slug>/", ConceptDetailView.as_view(), name="concept-detail"),
]
