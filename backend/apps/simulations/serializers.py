from rest_framework import serializers

from .models import SimulationResult, SimulationType


class SimulationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationResult
        fields = ("id", "sim_type", "parameters", "result_data", "status", "error_message", "created_at")
        read_only_fields = ("id", "result_data", "status", "error_message", "created_at")


class RunSimulationSerializer(serializers.Serializer):
    sim_type = serializers.ChoiceField(choices=SimulationType.choices)
    parameters = serializers.JSONField(default=dict)

    def validate_parameters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Parameters must be a JSON object.")
        allowed_keys = {"n", "L", "points", "E", "V0", "a", "mass", "omega", "t"}
        unknown = set(value.keys()) - allowed_keys
        if unknown:
            raise serializers.ValidationError(f"Unknown parameter keys: {unknown}")
        return value
