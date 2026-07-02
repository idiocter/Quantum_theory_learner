from django.urls import path

from .views import (
    BookmarkToggleView,
    BranchListView,
    ConceptDetailView,
    ConceptListView,
    ConceptSearchView,
    FormulaIndexView,
    GlossaryDetailView,
    GlossaryListView,
    KnowledgeGraphView,
    LessonUnlockView,
    ProgressView,
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
    path("glossary/", GlossaryListView.as_view(), name="glossary-list"),
    path("glossary/<slug:slug>/", GlossaryDetailView.as_view(), name="glossary-detail"),
    path("unlocks/", LessonUnlockView.as_view(), name="lesson-unlocks"),
    path("progress/", ProgressView.as_view(), name="progress"),
    path("<slug:slug>/bookmark/", BookmarkToggleView.as_view(), name="bookmark-toggle"),
    path("<slug:slug>/", ConceptDetailView.as_view(), name="concept-detail"),
]
