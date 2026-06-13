from django.urls import path

from .views import (
    CSRFView,
    GoogleAuthView,
    LogoutView,
    MeView,
    TokenRefreshCookieView,
    UserProgressView,
)

urlpatterns = [
    path("google/", GoogleAuthView.as_view(), name="auth-google"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshCookieView.as_view(), name="auth-token-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/progress/", UserProgressView.as_view(), name="auth-progress"),
    path("csrf/", CSRFView.as_view(), name="auth-csrf"),
]
