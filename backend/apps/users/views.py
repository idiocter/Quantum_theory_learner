import logging
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.utils.text import slugify
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProgress
from .serializers import (
    UserProgressSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

JWT_SETTINGS = settings.SIMPLE_JWT


def _unique_username(base: str) -> str:
    """Derive a unique, URL-safe username from a Google display name or email."""
    candidate = slugify(base).replace("-", "_")[:20] or "user"
    username = candidate
    while User.objects.filter(username=username).exists():
        username = f"{candidate}_{uuid.uuid4().hex[:6]}"
    return username


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


class GoogleAuthView(APIView):
    """Authenticate via a Google ID token (Google Identity Services credential).

    The frontend obtains the ID token from Google's Sign-In button and POSTs it
    here. We verify it against our OAuth client ID, then get-or-create the user
    and issue the same httpOnly JWT cookies used elsewhere. There is no
    email/password path — Google is the only identity provider.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.GOOGLE_CLIENT_ID:
            logger.error("Google auth attempted but GOOGLE_CLIENT_ID is not configured.")
            return Response(
                {"detail": "Google sign-in is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        credential = request.data.get("credential", "")
        if not credential:
            return Response({"detail": "Missing Google credential."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            logger.warning("Rejected invalid Google credential.")
            return Response({"detail": "Invalid Google credential."}, status=status.HTTP_401_UNAUTHORIZED)

        if not idinfo.get("email_verified"):
            return Response(
                {"detail": "Your Google email is not verified."}, status=status.HTTP_403_FORBIDDEN
            )

        email = idinfo["email"].lower().strip()
        display_name = idinfo.get("name") or email.split("@")[0]

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": _unique_username(display_name),
                "is_verified": True,
                "oauth_provider": "google",
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
            UserProgress.objects.create(user=user)
            logger.info("New user created via Google: %s", user.email)
        elif not user.is_active:
            return Response({"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "user": UserSerializer(user).data,
                "message": "Login successful.",
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        logger.info("Google auth succeeded for %s (created=%s)", user.email, created)
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
