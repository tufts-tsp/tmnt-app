from django.urls import path
from django.contrib import admin

from . import views

urlpatterns = [
    path("tmnt/", views.workspace, name="workspace"),
    # path("api/add_actor", views.add_actor, name="api/add_actor"),
    # path("api/add_server", views.add_server, name="api/add_server"),
    # path("api/add_process", views.add_process, name="api/add_process"),
    # path("api/add_lambda", views.add_lambda, name="api/add_lambda"),
    # path("api/add_boundary", views.add_boundary, name="api/add_boundary"),
    path("api/edit_boundary", views.edit_boundary, name="api/edit_boundary"),
    path("api/add_entity", views.add_entity, name="api/add_entity"),
    path("api/add_externalasset", views.add_externalasset, name="api/add_externalasset"),
    # path("api/add_datastore", views.add_datastore, name="api/add_datastore"),
    path("api/add_threat", views.add_threat, name="api/add_threat"),# TODO: add to asset_viewer
    path("api/edit_threat", views.edit_threat, name="api/edit_threat"), # TODO: add to asset_viewer
    path("api/delete_threat", views.delete_threat, name="api/delete_threat"),# TODO: add to asset_viewer
    path("api/add_assumption", views.add_assumption, name="api/add_assumption"),# TODO: add to asset_viewer
    path("api/edit_assumption", views.edit_assumption, name="api/edit_assumption"),# TODO: add to asset_viewer
    path("api/delete_assumption", views.delete_assumption, name="api/delete_assumption"),# TODO: add to asset_viewer
    path("api/delete_asset", views.delete_asset, name="api/delete_asset"),
    path("api/delete_all_assets", views.delete_all_assets, name="api/delete_all_assets"),
    # path("api/add_dataflow", views.add_dataflow, name="api/add_dataflow"),
    path("api/load_dfd", views.load_dfd, name="api/load_dfd"),
    path("admin/", admin.site.urls),
]
