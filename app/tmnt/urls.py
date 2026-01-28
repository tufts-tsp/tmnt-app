from django.urls import path, include
from django.contrib import admin

from . import views
from .views import SignUpView

urlpatterns = [
    path("tmnt/<str:project_name>", views.workspace, name="workspace"),
    path("tmnt/", views.project_list, name="tmnt_default"),
    path("", views.project_list, name="project_list_default"),
    # path("api/add_actor", views.add_actor, name="api/add_actor"),
    # path("api/add_server", views.add_server, name="api/add_server"),
    # path("api/add_process", views.add_process, name="api/add_process"),
    # path("api/add_lambda", views.add_lambda, name="api/add_lambda"),
    # path("api/add_boundary", views.add_boundary, name="api/add_boundary"),
    # path("api/add_datastore", views.add_datastore, name="api/add_datastore"),
    # path("api/add_dataflow", views.add_dataflow, name="api/add_dataflow"),
    path("api/edit_boundary", views.edit_boundary, name="api/edit_boundary"),
    path("api/add_entity", views.add_entity, name="api/add_entity"),
    path("api/rename_entity", views.rename_entity, name="api/rename_entity"),
    path("api/rename_dataflow", views.rename_dataflow, name="api/rename_dataflow"),
    path("api/add_externalasset", views.add_externalasset, name="api/add_externalasset"),
    path("api/add_threat", views.add_threat, name="api/add_threat"),
    path("api/edit_threat", views.edit_threat, name="api/edit_threat"),
    path("api/delete_threat", views.delete_threat, name="api/delete_threat"),
    path("api/add_assumption", views.add_assumption, name="api/add_assumption"),
    path("api/edit_assumption", views.edit_assumption, name="api/edit_assumption"),
    path("api/delete_assumption", views.delete_assumption, name="api/delete_assumption"),
    path("api/add_control", views.add_control, name="api/add_control"),
    path("api/edit_control", views.edit_control, name="api/edit_control"),
    path("api/delete_control", views.delete_control, name="api/delete_control"),
    path("api/delete_asset", views.delete_asset, name="api/delete_asset"),
    path("api/update_node_position", views.update_node_position, name="api/update_node_position"),
    path("api/delete_all_assets", views.delete_all_assets, name="api/delete_all_assets"),
    path("api/load_dfd/<str:project_name>", views.load_dfd, name="api/load_dfd"),
    path("view_projects/", views.project_list, name="view_projects"),
    path("create_project/", views.create_project, name="create_project"),
    path("delete_project/<str:project_name>", views.delete_project, name="delete_project"),
    path("edit_project/<str:project_name>", views.edit_project, name="edit_project"),
    path("admin/", admin.site.urls),
    # path("register/", SignUpView.as_view(), name="register"),
    path("submit_experiment/", views.submit_experiment, name="submit_experiment"),
    path("accounts/", include("django.contrib.auth.urls")),  # For login/logout
]
