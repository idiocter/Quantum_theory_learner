from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from apps.concepts.views import SitemapView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("sitemap.xml", SitemapView.as_view(), name="sitemap"),
    path("api/auth/", include("apps.users.urls")),
    path("api/concepts/", include("apps.concepts.urls")),
    path("api/simulations/", include("apps.simulations.urls")),
    path("api/quizzes/", include("apps.quizzes.urls")),
    path("api/ai/", include("apps.ai_tutor.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=getattr(settings, "MEDIA_ROOT", None))
