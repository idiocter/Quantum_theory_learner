from django.urls import path

from .views import (
    CSRFView,
    LoginView,
    LogoutView,
    MeView,
    PasswordChangeView,
    RegisterView,
    TokenRefreshCookieView,
    UserProgressView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshCookieView.as_view(), name="auth-token-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/password/", PasswordChangeView.as_view(), name="auth-password-change"),
    path("me/progress/", UserProgressView.as_view(), name="auth-progress"),
    path("csrf/", CSRFView.as_view(), name="auth-csrf"),
]
