from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """JWT auth that also accepts the access token from an httpOnly cookie.

    The login flow issues the access token as an httpOnly cookie (so the token
    is never exposed to JavaScript). Stock ``JWTAuthentication`` only inspects
    the ``Authorization`` header, so without this the cookie is never read and
    every authenticated request 401s. We fall back to the header to keep
    ``Authorization: Bearer`` working for non-browser clients.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            cookie_name = settings.SIMPLE_JWT.get("AUTH_COOKIE", "access_token")
            raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
