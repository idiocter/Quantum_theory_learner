from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.validators import validate_no_script


class Quiz(TimeStampedModel):
    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    title = models.CharField(max_length=200)
    concept = models.ForeignKey("concepts.Concept", on_delete=models.SET_NULL, null=True, blank=True, related_name="quizzes")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    description = models.TextField(blank=True)
    time_limit_minutes = models.IntegerField(null=True, blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        db_table = "quizzes"
        verbose_name_plural = "quizzes"

    def __str__(self):
        return self.title


class Question(TimeStampedModel):
    TYPE_CHOICES = [
        ("mcq", "Multiple Choice"),
        ("numerical", "Numerical"),
        ("true_false", "True/False"),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="mcq")
    text = models.TextField(validators=[validate_no_script])
    hint = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    points = models.IntegerField(default=1)
    order = models.IntegerField(default=0)

    # MCQ options stored as JSON: [{"id": "a", "text": "...", "is_correct": true}, ...]
    options = models.JSONField(default=list, blank=True)

    # Numerical answer
    correct_numerical = models.FloatField(null=True, blank=True)
    numerical_tolerance = models.FloatField(default=0.01)  # ±1% by default

    class Meta:
        db_table = "quiz_questions"
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.text[:60]}"


class QuizAttempt(TimeStampedModel):
    STATUS_CHOICES = [
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("timed_out", "Timed Out"),
    ]

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="quiz_attempts")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    answers = models.JSONField(default=dict)  # {question_id: answer}
    score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="in_progress")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "quiz_attempts"
        indexes = [models.Index(fields=["user", "quiz"]), models.Index(fields=["status"])]

    @property
    def percentage(self):
        if self.max_score == 0:
            return 0
        return round((self.score / self.max_score) * 100, 1)

    def __str__(self):
        return f"{self.user.email} – {self.quiz.title} ({self.status})"
