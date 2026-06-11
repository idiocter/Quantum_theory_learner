from rest_framework import serializers

from .models import Category, Concept, ConceptContent, ConceptLink


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
    prerequisites_count = serializers.SerializerMethodField()

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "summary", "difficulty", "order",
                  "thumbnail", "related_simulation", "is_published", "view_count", "prerequisites_count")

    def get_prerequisites_count(self, obj):
        return obj.prerequisites.count()


class ConceptDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    contents = ConceptContentSerializer(many=True, read_only=True)
    prerequisites = serializers.SerializerMethodField()
    unlocks = serializers.SerializerMethodField()

    class Meta:
        model = Concept
        fields = ("id", "title", "slug", "category", "summary", "difficulty", "order",
                  "thumbnail", "related_simulation", "is_published", "view_count",
                  "prerequisites", "unlocks", "contents", "created_at", "updated_at")

    def get_prerequisites(self, obj):
        return ConceptListSerializer(obj.prerequisites.all(), many=True).data

    def get_unlocks(self, obj):
        return ConceptListSerializer(obj.unlocks.all(), many=True).data


class KnowledgeGraphSerializer(serializers.Serializer):
    """Returns graph nodes and edges for the frontend force-graph."""

    nodes = serializers.SerializerMethodField()
    edges = serializers.SerializerMethodField()

    def to_representation(self, instance):
        concepts = instance["concepts"]
        links = instance["links"]
        return {
            "nodes": [
                {
                    "id": str(c.id),
                    "label": c.title,
                    "slug": c.slug,
                    "difficulty": c.difficulty,
                    "category": c.category.name if c.category else None,
                    "color": c.category.color if c.category else "#4F46E5",
                }
                for c in concepts
            ],
            "edges": [
                {
                    "source": str(link.source_id),
                    "target": str(link.target_id),
                    "relation": link.relation,
                    "weight": link.weight,
                }
                for link in links
            ],
        }
