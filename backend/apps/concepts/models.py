from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.validators import validate_no_script


class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # icon name/class
    color = models.CharField(max_length=7, default="#4F46E5")  # hex color

    class Meta:
        db_table = "concept_categories"
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Concept(TimeStampedModel):
    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="concepts")
    summary = models.TextField(max_length=500, validators=[validate_no_script])
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    order = models.IntegerField(default=0, db_index=True)
    thumbnail = models.ImageField(upload_to="concepts/thumbs/", blank=True, null=True)
    related_simulation = models.CharField(max_length=50, blank=True)  # simulation type key
    prerequisites = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="unlocks")
    is_published = models.BooleanField(default=True)
    view_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "concepts"
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["category", "order"]),
        ]

    def __str__(self):
        return self.title


class ConceptContent(TimeStampedModel):
    """Stores versioned content at each difficulty level for a concept."""

    LEVEL_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="contents")
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    explanation = models.TextField(validators=[validate_no_script])
    math_derivation = models.TextField(blank=True, validators=[validate_no_script])
    key_equations = models.JSONField(default=list)  # [{"label": "...", "latex": "..."}]
    further_reading = models.JSONField(default=list)  # [{"title": "...", "url": "..."}]

    class Meta:
        db_table = "concept_contents"
        unique_together = [("concept", "level")]
        ordering = ["level"]

    def __str__(self):
        return f"{self.concept.title} ({self.level})"


class ConceptLink(TimeStampedModel):
    """Directed edge in the knowledge graph."""

    RELATION_CHOICES = [
        ("prerequisite", "Prerequisite"),
        ("related", "Related"),
        ("extension", "Extension"),
        ("application", "Application"),
    ]

    source = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="outgoing_links")
    target = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="incoming_links")
    relation = models.CharField(max_length=20, choices=RELATION_CHOICES, default="related")
    weight = models.FloatField(default=1.0)

    class Meta:
        db_table = "concept_links"
        unique_together = [("source", "target")]

    def __str__(self):
        return f"{self.source.slug} → {self.target.slug} ({self.relation})"
