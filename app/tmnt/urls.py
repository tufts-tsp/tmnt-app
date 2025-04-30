from django.urls import path
from django.contrib import admin

from . import views

urlpatterns = [
    path("tmnt/", views.workspace, name="workspace"),
    path("api/add_actor", views.add_actor, name="api/add_actor"),
    path("api/add_server", views.add_server, name="api/add_server"),
    path("api/add_process", views.add_process, name="api/add_process"),
    path("api/add_lambda", views.add_lambda, name="api/add_lambda"),
    path("api/add_boundary", views.add_boundary, name="api/add_boundary"),
    path("api/add_externalasset", views.add_externalasset, name="api/add_externalasset"),
    path("api/add_datastore", views.add_datastore, name="api/add_datastore"),
    path("api/delete_asset", views.delete_asset, name="api/delete_asset"),
    path("api/delete_all_assets", views.delete_all_assets, name="api/delete_all_assets"),
    path("api/add_dataflow", views.add_dataflow, name="api/add_dataflow"),
    path("api/load_dfd", views.load_dfd, name="api/load_dfd"),
    path("admin/", admin.site.urls),
]
