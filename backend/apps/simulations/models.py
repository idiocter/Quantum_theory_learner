from django.db import models

from apps.core.models import TimeStampedModel


class SimulationType(models.TextChoices):
    DOUBLE_SLIT = "double_slit", "Double Slit Experiment"
    PARTICLE_BOX = "particle_box", "Particle in a Box"
    WAVEFUNCTION = "wavefunction", "Wavefunction Evolution"
    TUNNELING = "tunneling", "Quantum Tunneling"
    HARMONIC = "harmonic", "Quantum Harmonic Oscillator"
    HYDROGEN = "hydrogen", "Hydrogen Atom"


class SimulationResult(TimeStampedModel):
    """Stores async simulation computation results for heavy tasks."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="simulation_results")
    sim_type = models.CharField(max_length=30, choices=SimulationType.choices)
    parameters = models.JSONField(default=dict)
    result_data = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    celery_task_id = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "simulation_results"
        indexes = [
            models.Index(fields=["user", "sim_type"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.sim_type} by {self.user.email} ({self.status})"
