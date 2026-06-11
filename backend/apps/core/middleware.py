import logging
import time

logger = logging.getLogger("apps.core.requests")


class RequestLoggingMiddleware:
    """Logs method, path, status, and duration for every request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        # Skip logging static/media
        if not request.path.startswith(("/static/", "/media/")):
            logger.info(
                "%s %s %s %.1fms user=%s",
                request.method,
                request.path,
                response.status_code,
                duration_ms,
                getattr(request.user, "id", "anon"),
            )

        return response
