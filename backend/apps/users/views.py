import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProgress
from .serializers import (
    PasswordChangeSerializer,
    RegisterSerializer,
    UserProgressSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

JWT_SETTINGS = settings.SIMPLE_JWT


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    samesite = JWT_SETTINGS.get("AUTH_COOKIE_SAMESITE", "Lax")
    secure = JWT_SETTINGS.get("AUTH_COOKIE_SECURE", True)
    response.set_cookie(
        JWT_SETTINGS["AUTH_COOKIE"],
        access,
        max_age=int(JWT_SETTINGS["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        JWT_SETTINGS["AUTH_COOKIE_REFRESH"],
        refresh,
        max_age=int(JWT_SETTINGS["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/api/auth/token/refresh/",
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        UserProgress.objects.create(user=user)

        refresh = RefreshToken.for_user(user)
        response = Response(
            {"user": UserSerializer(user).data, "message": "Registration successful."},
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        logger.info("New user registered: %s", user.email)
        return response


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").lower().strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            logger.warning("Failed login attempt for email: %s", email)
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            logger.warning("Invalid password for user: %s", email)
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        response = Response({"user": UserSerializer(user).data, "message": "Login successful."})
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        logger.info("User logged in: %s", user.email)
        return response


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(JWT_SETTINGS.get("AUTH_COOKIE_REFRESH", "refresh_token"))
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        response = Response({"message": "Logged out successfully."})
        response.delete_cookie(JWT_SETTINGS["AUTH_COOKIE"])
        response.delete_cookie(JWT_SETTINGS["AUTH_COOKIE_REFRESH"])
        return response


class TokenRefreshCookieView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(JWT_SETTINGS.get("AUTH_COOKIE_REFRESH", "refresh_token"))
        if not refresh_token:
            return Response({"detail": "Refresh token not found."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = RefreshToken(refresh_token)
            access = str(token.access_token)
            new_refresh = str(token)
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({"message": "Token refreshed."})
        _set_auth_cookies(response, access, new_refresh)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        logger.info("Password changed for user: %s", user.email)
        return Response({"message": "Password changed successfully."})


class UserProgressView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProgressSerializer

    def get_object(self):
        progress, _ = UserProgress.objects.get_or_create(user=self.request.user)
        return progress


class CSRFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})
