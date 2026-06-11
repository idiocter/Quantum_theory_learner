from .base import *  # noqa: F403, F401

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Relax CORS in development
CORS_ALLOW_ALL_ORIGINS = True
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
