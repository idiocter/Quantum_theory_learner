from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import TimeStampedModel


class User(AbstractUser):
    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, max_length=500)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    preferred_difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default="beginner")
    is_verified = models.BooleanField(default=False)
    oauth_provider = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["email"]), models.Index(fields=["username"])]

    def __str__(self):
        return self.email


class UserProgress(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="progress")
    concepts_completed = models.ManyToManyField("concepts.Concept", blank=True, related_name="completors")
    total_quiz_score = models.IntegerField(default=0)
    quiz_attempts = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_active = models.DateField(null=True, blank=True)
    xp_points = models.IntegerField(default=0)

    class Meta:
        db_table = "user_progress"

    def __str__(self):
        return f"{self.user.email} progress"
