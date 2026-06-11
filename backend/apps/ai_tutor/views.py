import logging

from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import (
    ConversationDetailSerializer,
    ConversationListSerializer,
    CreateConversationSerializer,
    SendMessageSerializer,
)
from .tasks import generate_ai_response

logger = logging.getLogger(__name__)

MAX_MESSAGES_PER_CONVERSATION = 100


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CreateConversationSerializer
        return ConversationListSerializer

    def get_queryset(self):
        return (
            Conversation.objects.filter(user=self.request.user, is_active=True)
            .prefetch_related("messages")
            .select_related("concept")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        out = ConversationListSerializer(serializer.instance)
        return Response(out.data, status=status.HTTP_201_CREATED)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user).select_related("concept").prefetch_related("messages")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class SendMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        # Rate limiting: 10 AI requests per minute per user (mirrors nginx ai zone)
        limited = getattr(request, "limited", False)
        if not limited:
            limited = _check_rate_limit(request)
        if limited:
            return Response(
                {"detail": "Too many AI requests. Please wait before sending another message."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        conversation = get_object_or_404(Conversation, pk=pk, user=request.user, is_active=True)

        if conversation.messages.count() >= MAX_MESSAGES_PER_CONVERSATION:
            return Response(
                {"detail": "Conversation has reached the maximum message limit. Please start a new conversation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_content = serializer.validated_data["content"]

        user_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=user_content,
            status=Message.Status.COMPLETED,
        )

        assistant_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content="",
            status=Message.Status.PENDING,
        )

        generate_ai_response.delay(str(conversation.id), str(assistant_msg.id))

        return Response(
            {
                "user_message_id": str(user_msg.id),
                "assistant_message_id": str(assistant_msg.id),
                "status": "processing",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class MessageStatusView(APIView):
    """Poll endpoint: returns assistant message once status != pending."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, message_id):
        conversation = get_object_or_404(Conversation, pk=pk, user=request.user)
        msg = get_object_or_404(Message, pk=message_id, conversation=conversation, role=Message.Role.ASSISTANT)

        from .serializers import MessageSerializer
        return Response(MessageSerializer(msg).data)


def _check_rate_limit(request):
    """Applies django-ratelimit check programmatically at 10/min per user."""
    from django_ratelimit.core import is_ratelimited
    return is_ratelimited(
        request=request,
        group="ai_send_message",
        key="user",
        rate="10/m",
        increment=True,
    )
