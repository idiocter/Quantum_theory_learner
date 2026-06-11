from django.urls import path

from .views import RunSimulationView, SimulationDetailView, SimulationListView, SimulationTypesView

urlpatterns = [
    path("", SimulationListView.as_view(), name="simulation-list"),
    path("types/", SimulationTypesView.as_view(), name="simulation-types"),
    path("run/", RunSimulationView.as_view(), name="simulation-run"),
    path("<uuid:pk>/", SimulationDetailView.as_view(), name="simulation-detail"),
]
