from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SimulationResult, SimulationType
from .serializers import RunSimulationSerializer, SimulationResultSerializer
from .tasks import run_particle_box_simulation, run_tunneling_simulation

TASK_MAP = {
    SimulationType.PARTICLE_BOX: run_particle_box_simulation,
    SimulationType.TUNNELING: run_tunneling_simulation,
}


class SimulationListView(generics.ListAPIView):
    serializer_class = SimulationResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SimulationResult.objects.filter(user=self.request.user).order_by("-created_at")


class RunSimulationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RunSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sim_type = serializer.validated_data["sim_type"]
        params = serializer.validated_data["parameters"]

        result = SimulationResult.objects.create(
            user=request.user,
            sim_type=sim_type,
            parameters=params,
        )

        task_fn = TASK_MAP.get(sim_type)
        if task_fn:
            task = task_fn.delay(str(result.id), params)
            result.celery_task_id = task.id
            result.save(update_fields=["celery_task_id"])
        else:
            # Lightweight simulations are handled entirely client-side (Three.js)
            result.status = "completed"
            result.result_data = {"client_side": True, "sim_type": sim_type}
            result.save(update_fields=["status", "result_data"])

        return Response(SimulationResultSerializer(result).data, status=status.HTTP_202_ACCEPTED)


class SimulationDetailView(generics.RetrieveAPIView):
    serializer_class = SimulationResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SimulationResult.objects.filter(user=self.request.user)


class SimulationTypesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([{"key": k, "label": v} for k, v in SimulationType.choices])
