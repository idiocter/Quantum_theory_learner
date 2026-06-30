from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.db import models
from django.db.models import Value

from apps.core.models import TimeStampedModel
from apps.core.validators import validate_no_script


class Category(TimeStampedModel):
    """A top-level branch of the curriculum (e.g. Foundations, Quantum Information)."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # icon name/class
    color = models.CharField(max_length=7, default="#4F46E5")  # hex color
    order = models.IntegerField(default=0, db_index=True)  # branch display order

    class Meta:
        db_table = "concept_categories"
        verbose_name_plural = "categories"
        ordering = ["order", "name"]

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
    history = models.TextField(blank=True, validators=[validate_no_script])  # historical/discovery context
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    order = models.IntegerField(default=0, db_index=True)
    thumbnail = models.ImageField(upload_to="concepts/thumbs/", blank=True, null=True)
    related_simulation = models.CharField(max_length=50, blank=True)  # simulation type key
    prerequisites = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="unlocks")
    is_published = models.BooleanField(default=True)
    view_count = models.PositiveIntegerField(default=0)
    # Stored Postgres full-text index, maintained by a post_save signal (see signals.py).
    search_vector = SearchVectorField(null=True, blank=True, editable=False)

    class Meta:
        db_table = "concepts"
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["category", "order"]),
            GinIndex(fields=["search_vector"], name="concept_search_gin"),
        ]

    def update_search_vector(self):
        """Recompute the stored FTS vector from this concept's text + its content.

        Title/summary/history are weighted highest; the per-level explanation
        text is folded in as a lower weight so questions about the substance of
        a topic still match. Called from signals on save.
        """
        content_text = " ".join(
            t for t in self.contents.values_list("explanation", flat=True) if t
        )
        # config="english" so terms are stemmed and stopwords dropped — the same
        # config the queries use (see ai_tutor.retrieval / concepts.views), so
        # "what is superconductivity" matches a topic titled "Superconductivity".
        type(self).objects.filter(pk=self.pk).update(
            search_vector=(
                SearchVector(Value(self.title), weight="A", config="english")
                + SearchVector(Value(self.summary), weight="A", config="english")
                + SearchVector(Value(self.history), weight="B", config="english")
                + SearchVector(Value(content_text), weight="C", config="english")
            )
        )

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


class Formula(TimeStampedModel):
    """A structured formula attached to a concept.

    Richer than the inline `ConceptContent.key_equations` JSON: each formula
    carries a symbol legend and an optional step-by-step derivation, so the
    frontend can render an expandable derivation and a "what each symbol means"
    table, and the AI tutor can cite exact formulas.
    """

    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="formulas")
    latex = models.TextField(validators=[validate_no_script])  # raw LaTeX, e.g. r"E_n = \frac{n^2 h^2}{8mL^2}"
    description = models.TextField(blank=True, validators=[validate_no_script])
    symbols = models.JSONField(default=dict)  # {"E_n": "energy of level n", ...}
    derivation_steps = models.JSONField(default=list)  # ["step 1 ...", "step 2 ...."]
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "concept_formulas"
        ordering = ["order"]

    def __str__(self):
        return f"{self.concept.slug} formula #{self.order}"


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
