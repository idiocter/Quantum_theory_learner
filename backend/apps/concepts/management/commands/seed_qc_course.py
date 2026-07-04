"""One-shot seeder for the whole Quantum Computing course (Modules 0-8).

Runs the per-phase content commands and the assessment seeder in dependency
order so a fresh clone can reproduce the entire course after `migrate`:

    python manage.py migrate
    python manage.py seed_qc_course

Each underlying command is idempotent (update_or_create by slug), so this is
safe to re-run. The assessment step reads the JSON banks committed under
docs/quantum-computing/assessments/, so it works on a clean checkout.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand

# Content commands in dependency order (each seeds its own Concept rows first).
CONTENT_COMMANDS = [
    "populate_qc_foundations",   # Modules 0-1
    "populate_qc_algorithms",    # Modules 2-3
    "populate_qc_practicum_ec",  # Modules 4-5
    "populate_qc_frontier",      # Modules 6-8
]


class Command(BaseCommand):
    help = "Seed the entire Quantum Computing course (content + assessments), idempotently."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-assessments",
            action="store_true",
            help="Seed lesson content only; skip the assessment banks.",
        )

    def handle(self, *args, **opts):
        for cmd in CONTENT_COMMANDS:
            self.stdout.write(self.style.MIGRATE_HEADING(f"\n=== {cmd} ==="))
            call_command(cmd, stdout=self.stdout, stderr=self.stderr)

        if not opts["skip_assessments"]:
            self.stdout.write(self.style.MIGRATE_HEADING("\n=== seed_qc_assessments ==="))
            call_command("seed_qc_assessments", stdout=self.stdout, stderr=self.stderr)

        self.stdout.write(self.style.SUCCESS("\nQuantum Computing course seeded (Modules 0-8)."))
