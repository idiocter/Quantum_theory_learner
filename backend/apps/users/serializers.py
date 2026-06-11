from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.core.validators import validate_image_upload

from .models import UserProgress

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def validate_email(self, value):
        return value.lower().strip()

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)


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


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs


class UserProgressSerializer(serializers.ModelSerializer):
    concepts_completed_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProgress
        fields = ("concepts_completed_count", "total_quiz_score", "quiz_attempts", "streak_days", "xp_points", "last_active")

    def get_concepts_completed_count(self, obj):
        return obj.concepts_completed.count()
