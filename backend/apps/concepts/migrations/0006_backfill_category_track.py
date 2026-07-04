from django.db import migrations


def set_track(apps, schema_editor):
    """Move the Quantum Computing branches (qc-* slugs) onto the computing track;
    everything else stays on the default quantum-physics track."""
    Category = apps.get_model("concepts", "Category")
    Category.objects.filter(slug__startswith="qc-").update(track="quantum-computing")
    Category.objects.exclude(slug__startswith="qc-").update(track="quantum-physics")


def unset_track(apps, schema_editor):
    Category = apps.get_model("concepts", "Category")
    Category.objects.update(track="quantum-physics")


class Migration(migrations.Migration):
    dependencies = [
        ("concepts", "0005_category_track"),
    ]

    operations = [
        migrations.RunPython(set_track, unset_track),
    ]
