from rest_framework import serializers

from .models import Category, Concept, ConceptContent

# Rough reading-time estimate per difficulty, surfaced as `estimated_minutes`.
ESTIMATED_MINUTES_BY_DIFFICULTY = {"beginner": 5, "intermediate": 8, "advanced": 12}


def _estimated_minutes(concept) -> int:
    return ESTIMATED_MINUTES_BY_DIFFICULTY.get(concept.difficulty, 6)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "icon", "color")


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
    prerequisites_count = serializers.SerializerMethodField()

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "summary", "description", "difficulty", "order",
                  "thumbnail", "related_simulation", "is_published", "view_count",
                  "estimated_minutes", "prerequisites_count")

    def get_estimated_minutes(self, obj):
        return _estimated_minutes(obj)

    def get_prerequisites_count(self, obj):
        return obj.prerequisites.count()


class ConceptDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    contents = ConceptContentSerializer(many=True, read_only=True)
    description = serializers.CharField(source="summary", read_only=True)
    estimated_minutes = serializers.SerializerMethodField()
    # Slugs only — the detail page links each prerequisite to /concepts/<slug>.
    prerequisites = serializers.SerializerMethodField()
    unlocks = serializers.SerializerMethodField()

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "summary", "description", "difficulty", "order",
                  "thumbnail", "related_simulation", "is_published", "view_count", "estimated_minutes",
                  "prerequisites", "unlocks", "contents", "created_at", "updated_at")

    def get_estimated_minutes(self, obj):
        return _estimated_minutes(obj)

    def get_prerequisites(self, obj):
        return list(obj.prerequisites.values_list("slug", flat=True))

    def get_unlocks(self, obj):
        return list(obj.unlocks.values_list("slug", flat=True))


class KnowledgeGraphSerializer(serializers.Serializer):
    """Returns graph nodes and edges for the frontend force-graph.

    Nodes are keyed by slug so the canvas can navigate straight to
    /concepts/<slug>, and edges are derived from each concept's prerequisites
    (prerequisite -> concept).
    """

    def to_representation(self, instance):
        concepts = instance["concepts"]
        nodes, edges = [], []
        for c in concepts:
            nodes.append(
                {
                    "id": c.slug,
                    "title": c.title,
                    "difficulty": c.difficulty,
                    "category_color": c.category.color if c.category else "#4F46E5",
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
        return {"nodes": nodes, "edges": edges}
