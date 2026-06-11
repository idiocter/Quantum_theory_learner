import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "qls.settings.development")

app = Celery("qls")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.task_routes = {
    "apps.simulations.tasks.*": {"queue": "simulations"},
    "apps.ai_tutor.tasks.*": {"queue": "ai_tasks"},
    "*": {"queue": "default"},
}

app.conf.task_serializer = "json"
app.conf.result_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.timezone = "UTC"
app.conf.enable_utc = True
app.conf.task_track_started = True
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1
