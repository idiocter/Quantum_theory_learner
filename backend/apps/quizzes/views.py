import logging
from datetime import datetime, timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAuthenticatedOrReadOnly

from .models import Question, Quiz, QuizAttempt
from .serializers import (
    QuizAttemptSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    SubmitAnswersSerializer,
)

logger = logging.getLogger(__name__)


class QuizListView(generics.ListAPIView):
    queryset = Quiz.objects.filter(is_published=True).prefetch_related("questions")
    serializer_class = QuizListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["difficulty", "concept"]


class QuizDetailView(generics.RetrieveAPIView):
    queryset = Quiz.objects.filter(is_published=True).prefetch_related("questions")
    serializer_class = QuizDetailSerializer
    permission_classes = [permissions.AllowAny]


class StartQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        quiz = generics.get_object_or_404(Quiz, pk=pk, is_published=True)

        # Allow only one in-progress attempt per quiz
        existing = QuizAttempt.objects.filter(user=request.user, quiz=quiz, status="in_progress").first()
        if existing:
            return Response(QuizAttemptSerializer(existing).data)

        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            max_score=sum(q.points for q in quiz.questions.all()),
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class SubmitQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        attempt = generics.get_object_or_404(QuizAttempt, pk=pk, user=request.user)
        if attempt.status != "in_progress":
            return Response({"detail": "Attempt already completed."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SubmitAnswersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = serializer.validated_data["answers"]

        questions = attempt.quiz.questions.all()
        score = 0
        graded = {}

        for q in questions:
            user_ans = answers.get(str(q.id), "").strip().lower()
            if q.question_type == "mcq" or q.question_type == "true_false":
                correct = next((o["id"] for o in q.options if o.get("is_correct")), None)
                is_correct = user_ans == (correct or "").lower()
            elif q.question_type == "numerical":
                try:
                    num_ans = float(user_ans)
                    is_correct = abs(num_ans - q.correct_numerical) <= (abs(q.correct_numerical) * q.numerical_tolerance)
                except (ValueError, TypeError):
                    is_correct = False
            else:
                is_correct = False

            if is_correct:
                score += q.points

            graded[str(q.id)] = {
                "submitted": answers.get(str(q.id), ""),
                "correct": is_correct,
                "explanation": q.explanation,
            }

        attempt.answers = graded
        attempt.score = score
        attempt.status = "completed"
        attempt.completed_at = datetime.now(timezone.utc)
        attempt.save()

        # Update user XP
        try:
            from apps.users.models import UserProgress
            progress, _ = UserProgress.objects.get_or_create(user=request.user)
            progress.total_quiz_score += score
            progress.quiz_attempts += 1
            progress.xp_points += score * 10
            progress.save(update_fields=["total_quiz_score", "quiz_attempts", "xp_points"])
        except Exception:
            logger.warning("Failed to update user progress for attempt %s", pk)

        return Response(QuizAttemptSerializer(attempt).data)


class UserAttemptsView(generics.ListAPIView):
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user).select_related("quiz").order_by("-created_at")
