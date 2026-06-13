from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.core.validators import validate_image_upload

from .models import UserProgress

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "bio", "avatar", "preferred_difficulty", "is_verified", "date_joined")
        read_only_fields = ("id", "email", "is_verified", "date_joined")


class UserUpdateSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, validators=[validate_image_upload])

    class Meta:
        model = User
        fields = ("username", "bio", "avatar", "preferred_difficulty")

    def validate_username(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")
        return value


class UserProgressSerializer(serializers.ModelSerializer):
    concepts_completed_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProgress
        fields = ("concepts_completed_count", "total_quiz_score", "quiz_attempts", "streak_days", "xp_points", "last_active")

    def get_concepts_completed_count(self, obj):
        return obj.concepts_completed.count()
