import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "qls.settings.production")

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
