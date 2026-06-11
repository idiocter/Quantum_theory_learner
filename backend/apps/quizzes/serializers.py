from rest_framework import serializers

from .models import Question, Quiz, QuizAttempt


class QuestionSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ("id", "question_type", "text", "hint", "options", "points", "order")

    def get_options(self, obj):
        # Strip is_correct flag before returning to client
        return [{"id": o["id"], "text": o["text"]} for o in obj.options]


class QuizListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ("id", "title", "difficulty", "description", "time_limit_minutes", "question_count")

    def get_question_count(self, obj):
        return obj.questions.count()


class QuizDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ("id", "title", "difficulty", "description", "time_limit_minutes", "questions")


class SubmitAnswersSerializer(serializers.Serializer):
    answers = serializers.DictField(
        child=serializers.CharField(allow_blank=True),
        help_text="Map of question_id → answer value",
    )


class QuizAttemptSerializer(serializers.ModelSerializer):
    percentage = serializers.ReadOnlyField()
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ("id", "quiz", "quiz_title", "score", "max_score", "percentage", "status", "answers", "started_at", "completed_at")
        read_only_fields = ("id", "score", "max_score", "status", "started_at", "completed_at")
