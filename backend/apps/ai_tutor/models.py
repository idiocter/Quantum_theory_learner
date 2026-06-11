from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Conversation(TimeStampedModel):
    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations")
    concept = models.ForeignKey(
        "concepts.Concept",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    title = models.CharField(max_length=255, blank=True)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.INTERMEDIATE)
    is_active = models.BooleanField(default=True)
    total_tokens_used = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Conversation({self.user}, {self.title or self.id})"

    def auto_title_from_first_message(self):
        first = self.messages.filter(role="user").first()
        if first and not self.title:
            self.title = first.content[:80]
            self.save(update_fields=["title"])


class Message(TimeStampedModel):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        ERROR = "error", "Error"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.COMPLETED)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message({self.role}, {self.status}, conv={self.conversation_id})"
