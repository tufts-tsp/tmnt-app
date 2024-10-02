from django.urls import path
from django.contrib import admin

from . import views

urlpatterns = [
    path("tmnt/", views.workspace, name="workspace"),
    path("api/add_actor", views.add_actor, name="api/add_actor"),
    path("api/add_boundary", views.add_boundary, name="api/add_boundary"),
    path(
        "api/add_externalasset",
        views.add_externalasset,
        name="api/add_externalasset",
    ),
    path("api/add_datastore", views.add_datastore, name="api/add_datastore"),
    path("admin/", admin.site.urls),
]
