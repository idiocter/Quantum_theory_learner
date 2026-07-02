from django.contrib import admin

from .models import GlossaryTerm


@admin.register(GlossaryTerm)
class GlossaryTermAdmin(admin.ModelAdmin):
    list_display = ("term", "slug", "concept")
    list_select_related = ("concept",)
    search_fields = ("term", "slug", "definition")
    prepopulated_fields = {"slug": ("term",)}
    raw_id_fields = ("concept",)
    ordering = ("term",)
