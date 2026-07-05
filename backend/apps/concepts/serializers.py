from rest_framework import serializers

from .models import Category, Concept, ConceptContent, Formula, GlossaryTerm

# Rough reading-time estimate per difficulty, surfaced as `estimated_minutes`.
ESTIMATED_MINUTES_BY_DIFFICULTY = {"beginner": 5, "intermediate": 8, "advanced": 12}


def _estimated_minutes(concept) -> int:
    return ESTIMATED_MINUTES_BY_DIFFICULTY.get(concept.difficulty, 6)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "icon", "color", "order", "track")


class BranchSerializer(serializers.ModelSerializer):
    """A branch (category) with its published-topic count, for the branch list."""

    topic_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "icon", "color", "order", "track", "topic_count")


class FormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formula
        fields = ("id", "latex", "description", "symbols", "derivation_steps", "order")


class ConceptContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptContent
        fields = ("id", "level", "explanation", "math_derivation", "key_equations", "further_reading")


class ConceptListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    # The frontend reads `description` and `estimated_minutes`; map them onto the
    # model's `summary` and a difficulty-based estimate.
    description = serializers.CharField(source="summary", read_only=True)
    estimated_minutes = serializers.SerializerMethodField()
    # Read the annotation from the view's queryset (Count("prerequisites")).
    # Falls back to a live count if the queryset wasn't annotated.
    prerequisites_count = serializers.SerializerMethodField()

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "summary", "description", "difficulty", "order",
                  "thumbnail", "related_simulation", "is_published", "view_count",
                  "estimated_minutes", "prerequisites_count")

    def get_estimated_minutes(self, obj):
        return _estimated_minutes(obj)

    def get_prerequisites_count(self, obj):
        annotated = getattr(obj, "prerequisites_count", None)
        return annotated if annotated is not None else obj.prerequisites.count()


class ConceptDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    contents = ConceptContentSerializer(many=True, read_only=True)
    formulas = FormulaSerializer(many=True, read_only=True)
    description = serializers.CharField(source="summary", read_only=True)
    estimated_minutes = serializers.SerializerMethodField()
    # Slugs only — the detail page links each prerequisite to /concepts/<slug>.
    prerequisites = serializers.SerializerMethodField()
    unlocks = serializers.SerializerMethodField()

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "summary", "description", "history", "difficulty", "order",
                  "thumbnail", "related_simulation", "is_published", "view_count", "estimated_minutes",
                  "formulas", "prerequisites", "unlocks", "contents", "created_at", "updated_at")

    def get_estimated_minutes(self, obj):
        return _estimated_minutes(obj)

    def get_prerequisites(self, obj):
        return list(obj.prerequisites.values_list("slug", flat=True))

    def get_unlocks(self, obj):
        return list(obj.unlocks.values_list("slug", flat=True))


class ConceptSearchResultSerializer(serializers.ModelSerializer):
    """A ranked search hit: lightweight topic info + branch + relevance rank."""

    category = CategorySerializer(read_only=True)
    description = serializers.CharField(source="summary", read_only=True)
    rank = serializers.FloatField(read_only=True)

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "description", "difficulty", "rank")


class FormulaIndexSerializer(serializers.ModelSerializer):
    """A formula with its owning topic + branch, for the site-wide formula index."""

    concept_slug = serializers.CharField(source="concept.slug", read_only=True)
    concept_title = serializers.CharField(source="concept.title", read_only=True)
    branch = serializers.CharField(source="concept.category.name", read_only=True, default=None)

    class Meta:
        model = Formula
        fields = ("id", "latex", "description", "symbols", "derivation_steps",
                  "concept_slug", "concept_title", "branch")


class TopicProgressSerializer(serializers.ModelSerializer):
    """A single visited/bookmarked topic for the progress + dashboard views."""

    concept_slug = serializers.CharField(source="concept.slug", read_only=True)
    concept_title = serializers.CharField(source="concept.title", read_only=True)
    difficulty = serializers.CharField(source="concept.difficulty", read_only=True)
    branch_slug = serializers.CharField(source="concept.category.slug", read_only=True, default="")
    branch_name = serializers.CharField(source="concept.category.name", read_only=True, default="")

    class Meta:
        from .models import UserTopicProgress

        model = UserTopicProgress
        fields = (
            "concept_slug", "concept_title", "difficulty", "branch_slug", "branch_name",
            "bookmarked", "time_spent_seconds", "visited_at",
        )


class GlossaryTermSerializer(serializers.ModelSerializer):
    """A glossary term for the frontend linker.

    `concept_slug` (nullable) lets a tooltip deep-link to the lesson that
    defines the term via /concepts/<slug>.
    """

    concept_slug = serializers.CharField(source="concept.slug", read_only=True, default=None)
    concept_title = serializers.CharField(source="concept.title", read_only=True, default=None)

    class Meta:
        model = GlossaryTerm
        fields = ("id", "term", "slug", "definition", "concept_slug", "concept_title")


class LessonUnlockSerializer(serializers.Serializer):
    """Per-lesson unlock status computed server-side from the user's progress.

    A lesson is `unlocked` when every prerequisite concept has been visited
    (has a `UserTopicProgress` row for this user). Lessons with no prerequisites
    are always unlocked. The server is the source of truth; the client must not
    infer unlock state on its own.
    """

    slug = serializers.CharField()
    title = serializers.CharField()
    category_slug = serializers.CharField(allow_null=True)
    order = serializers.IntegerField()
    difficulty = serializers.CharField()
    visited = serializers.BooleanField()
    unlocked = serializers.BooleanField()
    prerequisites = serializers.ListField(child=serializers.DictField())
    missing_prerequisites = serializers.ListField(child=serializers.CharField())


class KnowledgeGraphSerializer(serializers.Serializer):
    """Returns graph nodes and edges for the frontend force-graph.

    Nodes are keyed by slug so the canvas can navigate straight to
    /concepts/<slug>, and edges are derived from each concept's prerequisites
    (prerequisite -> concept).
    """

    def to_representation(self, instance):
        concepts = instance["concepts"]
        nodes, edges = [], []
        degree = {}
        for c in concepts:
            nodes.append(
                {
                    "id": c.slug,
                    "title": c.title,
                    "difficulty": c.difficulty,
                    "category_color": c.category.color if c.category else "#4F46E5",
                    "branch_slug": c.category.slug if c.category else "",
                    "branch_name": c.category.name if c.category else "Uncategorized",
                    # connection_count is filled in once all edges are known.
                    "connection_count": 0,
                }
            )
            for prereq in c.prerequisites.all():
                edges.append(
                    {
                        "source": prereq.slug,
                        "target": c.slug,
                        "relationship": "prerequisite",
                    }
                )
                degree[prereq.slug] = degree.get(prereq.slug, 0) + 1
                degree[c.slug] = degree.get(c.slug, 0) + 1

        for n in nodes:
            n["connection_count"] = degree.get(n["id"], 0)
        return {"nodes": nodes, "edges": edges}
