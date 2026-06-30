"""Shared apply logic for the content-population commands.

`populate_foundations` and `populate_atomic` each describe their topics as a
list of dicts and hand them here. The underscore prefix keeps Django's command
loader from treating this module as a runnable command.

A topic dict looks like:

    {
        "slug": "double_slit",
        "history": "…prose, may contain inline $math$…",
        "related_simulation": "double_slit",     # optional; registry key
        "overview": ["para 1", "para 2", "para 3"],
        "math_derivation": "…optional prose…",
        "key_equations": [{"label": "…", "latex": "…"}],   # optional
        "further_reading": [{"title": "…", "url": "…"}],    # optional
        "prerequisites": ["wave_particle_duality"],          # optional, slugs
        "formulas": [
            {
                "latex": r"\\lambda = \\frac{h}{p}",
                "description": "…",
                "symbols": {r"\\lambda": "wavelength", "h": "Planck constant"},
                "derivation_steps": ["Start from …$E = hf$…", "…"],
            },
        ],
    }

Idempotent: matched by slug, re-running updates rows in place. Formula and
ConceptContent saves re-fire the FTS signal, so the search index stays current.
"""

from apps.concepts.models import Concept, ConceptContent, Formula


def apply_topic(stdout, style, topic):
    """Populate one already-seeded topic. Returns True if it existed."""
    try:
        concept = Concept.objects.get(slug=topic["slug"])
    except Concept.DoesNotExist:
        stdout.write(style.WARNING(f"  ✗ {topic['slug']} — not seeded; run seed_concepts first"))
        return False

    # Concept-level fields (history, simulation key).
    changed = []
    if "history" in topic:
        concept.history = topic["history"]
        changed.append("history")
    if "related_simulation" in topic:
        concept.related_simulation = topic["related_simulation"]
        changed.append("related_simulation")
    if changed:
        concept.save(update_fields=[*changed, "updated_at"])

    # The explanatory chapter at the topic's own difficulty level.
    if "overview" in topic:
        ConceptContent.objects.update_or_create(
            concept=concept,
            level=concept.difficulty,
            defaults={
                "explanation": "\n\n".join(topic["overview"]),
                "math_derivation": topic.get("math_derivation", ""),
                "key_equations": topic.get("key_equations", []),
                "further_reading": topic.get("further_reading", []),
            },
        )

    # Structured formulas (symbol legend + derivation steps).
    for i, f in enumerate(topic.get("formulas", [])):
        Formula.objects.update_or_create(
            concept=concept,
            order=i,
            defaults={
                "latex": f["latex"],
                "description": f.get("description", ""),
                "symbols": f.get("symbols", {}),
                "derivation_steps": f.get("derivation_steps", []),
            },
        )

    # Prerequisite edges (additive — never drops existing links).
    if topic.get("prerequisites"):
        prereqs = Concept.objects.filter(slug__in=topic["prerequisites"])
        missing = set(topic["prerequisites"]) - {p.slug for p in prereqs}
        if missing:
            stdout.write(style.WARNING(f"    · {concept.slug}: unknown prereq(s) {sorted(missing)}"))
        concept.prerequisites.add(*prereqs)

    stdout.write(f"  ✓ {concept.slug}")
    return True


def run(command, topics, label):
    """Apply a list of topics and print a summary."""
    command.stdout.write(command.style.MIGRATE_HEADING(f"Populating {label} ({len(topics)} topics)"))
    applied = sum(apply_topic(command.stdout, command.style, t) for t in topics)
    command.stdout.write(command.style.SUCCESS(f"Done — {applied}/{len(topics)} {label} topics populated."))
