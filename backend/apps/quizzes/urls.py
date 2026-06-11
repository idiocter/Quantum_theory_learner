from django.urls import path

from .views import QuizDetailView, QuizListView, StartQuizView, SubmitQuizView, UserAttemptsView

urlpatterns = [
    path("", QuizListView.as_view(), name="quiz-list"),
    path("my-attempts/", UserAttemptsView.as_view(), name="quiz-attempts"),
    path("<uuid:pk>/", QuizDetailView.as_view(), name="quiz-detail"),
    path("<uuid:pk>/start/", StartQuizView.as_view(), name="quiz-start"),
    path("attempts/<uuid:pk>/submit/", SubmitQuizView.as_view(), name="quiz-submit"),
]
