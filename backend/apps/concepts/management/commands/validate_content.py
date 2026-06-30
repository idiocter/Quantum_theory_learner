"""Content QA: verify every published topic is fully populated.

Checks that each published Concept has explanatory content and at least one
formula, and reports topics missing a simulation key. Exits non-zero on hard
failures (missing content or formulas) so it can gate a deploy/CI step.

    venv/bin/python manage.py validate_content
"""

from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.concepts.models import Concept


class Command(BaseCommand):
    help = "Validate that every published topic has content, formulas, and (optionally) a simulation."

    def add_arguments(self, parser):
        parser.add_argument(
            "--require-sim",
            action="store_true",
            help="Treat a missing related_simulation as a failure (default: warning only).",
        )

    def handle(self, *args, **options):
        require_sim = options["require_sim"]
        concepts = (
            Concept.objects.filter(is_published=True)
            .select_related("category")
            .annotate(n_contents=Count("contents", distinct=True), n_formulas=Count("formulas", distinct=True))
            .order_by("category__order", "order")
        )

        errors, warnings = [], []
        total = concepts.count()

        for c in concepts:
            if c.n_contents == 0:
                errors.append(f"{c.slug}: no ConceptContent (explanation missing)")
            elif not (c.contents.first() and c.contents.first().explanation.strip()):
                errors.append(f"{c.slug}: ConceptContent has empty explanation")
            if c.n_formulas == 0:
                errors.append(f"{c.slug}: no Formula rows")
            if not c.history.strip():
                warnings.append(f"{c.slug}: no history text")
            if not c.related_simulation:
                (errors if require_sim else warnings).append(f"{c.slug}: no related_simulation")

        for w in warnings:
            self.stdout.write(self.style.WARNING(f"  ⚠ {w}"))
        for e in errors:
            self.stdout.write(self.style.ERROR(f"  ✗ {e}"))

        sims = concepts.exclude(related_simulation="").count()
        self.stdout.write("")
        self.stdout.write(
            f"Checked {total} published topics · {sims} with a simulation · "
            f"{len(warnings)} warning(s) · {len(errors)} error(s)."
        )
        if errors:
            self.stderr.write(self.style.ERROR(f"FAILED: {len(errors)} content error(s)."))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("All published topics are fully populated."))
