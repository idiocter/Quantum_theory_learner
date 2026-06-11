from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "input_tokens", "output_tokens", "created_at")
        read_only_fields = fields


class ConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    concept_title = serializers.CharField(source="concept.title", read_only=True, default=None)

    class Meta:
        model = Conversation
        fields = ("id", "title", "difficulty", "concept", "concept_title", "total_tokens_used", "message_count", "updated_at")

    def get_message_count(self, obj):
        return obj.messages.count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    concept_title = serializers.CharField(source="concept.title", read_only=True, default=None)

    class Meta:
        model = Conversation
        fields = ("id", "title", "difficulty", "concept", "concept_title", "total_tokens_used", "messages", "created_at", "updated_at")


class CreateConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ("concept", "difficulty", "title")
        extra_kwargs = {"title": {"required": False}, "concept": {"required": False}}


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=4000, trim_whitespace=True)
