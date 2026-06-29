from django.apps import AppConfig


class ConceptsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.concepts"

    def ready(self):
        from . import signals  # noqa: F401  (registers FTS search_vector signals)
