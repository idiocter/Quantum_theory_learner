"""
Celery tasks for heavy simulation computations.
All physics runs server-side so the browser Three.js renderer just receives data.
"""
import logging
import math

import numpy as np
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue="simulations", max_retries=2)
def run_particle_box_simulation(self, result_id: str, params: dict):
    from .models import SimulationResult

    try:
        sim = SimulationResult.objects.get(id=result_id)
        sim.status = "running"
        sim.celery_task_id = self.request.id
        sim.save(update_fields=["status", "celery_task_id"])

        n = params.get("n", 1)  # quantum number
        L = params.get("L", 1.0)  # box length in nm
        points = params.get("points", 300)

        x = np.linspace(0, L, points)
        psi = np.sqrt(2 / L) * np.sin(n * np.pi * x / L)
        prob_density = psi ** 2
        energy = (n ** 2 * (math.pi ** 2)) / (2 * L ** 2)  # in ħ²/m units

        sim.result_data = {
            "x": x.tolist(),
            "psi": psi.tolist(),
            "prob_density": prob_density.tolist(),
            "energy": energy,
            "n": n,
            "L": L,
        }
        sim.status = "completed"
        sim.save(update_fields=["result_data", "status"])
    except Exception as exc:
        logger.error("Particle-in-box simulation failed: %s", exc)
        SimulationResult.objects.filter(id=result_id).update(status="failed", error_message=str(exc))
        raise self.retry(exc=exc, countdown=5)


@shared_task(bind=True, queue="simulations", max_retries=2)
def run_tunneling_simulation(self, result_id: str, params: dict):
    from .models import SimulationResult

    try:
        sim = SimulationResult.objects.get(id=result_id)
        sim.status = "running"
        sim.celery_task_id = self.request.id
        sim.save(update_fields=["status", "celery_task_id"])

        E = params.get("E", 0.5)        # particle energy
        V0 = params.get("V0", 1.0)      # barrier height
        a = params.get("a", 0.5)        # barrier width
        points = params.get("points", 400)

        x = np.linspace(-3, 3 + a, points)
        barrier_mask = (x >= 0) & (x <= a)

        # Transmission coefficient
        if E < V0:
            kappa = np.sqrt(2 * (V0 - E))
            T = 1 / (1 + (V0 ** 2 * np.sinh(kappa * a) ** 2) / (4 * E * (V0 - E)))
        else:
            k2 = np.sqrt(2 * (E - V0))
            T = 1 / (1 + (V0 ** 2 * np.sin(k2 * a) ** 2) / (4 * E * (E - V0)))

        R = 1 - T

        sim.result_data = {
            "x": x.tolist(),
            "barrier_mask": barrier_mask.tolist(),
            "transmission": float(T),
            "reflection": float(R),
            "E": E,
            "V0": V0,
            "a": a,
        }
        sim.status = "completed"
        sim.save(update_fields=["result_data", "status"])
    except Exception as exc:
        logger.error("Tunneling simulation failed: %s", exc)
        SimulationResult.objects.filter(id=result_id).update(status="failed", error_message=str(exc))
        raise self.retry(exc=exc, countdown=5)
