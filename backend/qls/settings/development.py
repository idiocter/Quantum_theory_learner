from .base import *  # noqa: F403, F401

DEBUG = True

ALLOWED_HOSTS = ["*"]

# CORS for local frontend dev (Next on :3000 → Django on :8000).
# NOTE: credentialed requests (withCredentials/cookies) are incompatible with
# CORS_ALLOW_ALL_ORIGINS=True — the spec forbids the "*" origin when credentials
# are sent, so the browser drops the response. Use an explicit origin list so
# django-cors-headers echoes the request origin instead.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

# Override cookie security for HTTP dev
SIMPLE_JWT["AUTH_COOKIE_SECURE"] = False  # noqa: F405

# Disable Cloudinary in dev if not configured — fall back to local filesystem
import os  # noqa: E402

if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "mediafiles"  # noqa: F405

# Dev email backend
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += ["django_extensions"]  # noqa: F405

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",
        },
    },
}
