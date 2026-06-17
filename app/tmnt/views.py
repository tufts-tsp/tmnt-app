from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import render, get_object_or_404, redirect
from .forms import UploadDFDFileForm, NewProjectForm
from .scripts.img_test import *
from .models import *
from django.db import transaction
import io
import os
import subprocess
from django.http import JsonResponse, HttpResponseRedirect
from django.contrib.auth.forms import UserCreationForm
from django.views.generic import CreateView
from django.views.decorators.http import require_POST
from django.urls import reverse_lazy
from django.urls import reverse
from .models import UserProfile

import grpc
from controller_pb2_grpc import ControllerStub

controller_host = os.getenv("CONTROLLER_HOST", "localhost")
controller_channel = grpc.insecure_channel(f"{controller_host}:50051")
controller_client = ControllerStub(controller_channel)


# base editor view
def test(request):
    # generate() # generate random color cat picture
    return render(request, "tmnt/test.html")

class SignUpView(CreateView):
    form_class = UserCreationForm
    success_url = reverse_lazy("login")  # redirect to login page after successful signup
    template_name = "registration/register.html"  # template for the signup page

    def form_valid(self, form):
        response = super().form_valid(form)

        user = self.object

        UserProfile.objects.get_or_create(
            user=user,
            defaults={"has_seen_tutorial": False}
        )

        return response

@login_required
@require_POST
def mark_tutorial_seen(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.has_seen_tutorial = True
    profile.save()
    return JsonResponse({"status": "ok"})

@login_required
@require_POST
def reset_tutorial(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.has_seen_tutorial = False
    profile.save()
    return JsonResponse({"status": "ok"})

# class ProjectsListView(LoginRequiredMixin, ListView):
#     model = Project
#     template_name = 'tmnt/projects.html'
#     context_object_name = 'user_myobjects'
#
#     def get_queryset(self):
#         # Filter Projects to only include those associated with the current user
#         return Project.objects.filter(user=self.request.user)

@login_required
def project_list(request):
    projects = Project.objects.filter(user=request.user).order_by("-created_at")[:10]

    # Ensure profile exists (prevents crashes for old accounts)
    profile, created = UserProfile.objects.get_or_create(user=request.user)

    show_tutorial = not profile.has_seen_tutorial

    return render(request, "tmnt/projects.html", {
        "projects": projects,
        "show_tutorial": show_tutorial,
    })


@login_required
def submit_experiment(request):
    if request.user.is_authenticated:
        # Mark the user as inactive
        request.user.is_active = False
        request.user.save()
        # Optional: Add a message for feedback
        # messages.info(request, "You have been logged out and your account is now inactive.")

    # Log the user out
    logout(request)
    # Redirect to a desired page (e.g., the home page or a specific inactive page)
    # TODO: replace url with Qualtrics survey when survey is live
    return redirect('https://tufts.qualtrics.com/jfe/form/SV_1OgC7ChGZa047Yi?cc=' + request.user.username)

@login_required
def create_project(request):
    if request.method == "POST":
        form = NewProjectForm(request.POST)
        if form.is_valid():
            # check if project with same name already exists for this user
            if Project.objects.filter(name=form.cleaned_data['name'], user=request.user).exists():
                form.add_error(
                    "name", "A project with this name already exists for this user."
                )
                return render(request, "tmnt/new_project.html", {"form": form})
            else:
                project = form.save(commit=False)
                project.user = request.user
                project.save()
            # return render(request, f"tmnt/{form.cleaned_data['name']}/")
            return HttpResponseRedirect('/view_projects/')  # redirect to project list after creation
        else:
            # if form is not valid, render the form again with errors
            return render(request, "tmnt/new_project.html", {"form": form})
    else:
        form = NewProjectForm()
        return render(request, "tmnt/new_project.html", {"form": form})

@login_required
def delete_project(request, project_name):
    project = get_object_or_404(Project, name=project_name, user=request.user)
    if project.experiment_mode:
        if not request.user.is_superuser:
            raise PermissionDenied("You must be a superuser to delete this project.")
    project.delete()
    # redirect to project list after deletion
    return HttpResponseRedirect('/view_projects/')

@login_required
def edit_project(request, project_name):
    if request.method == "POST":
        project = get_object_or_404(Project, name=project_name, user=request.user)
        form = NewProjectForm(request.POST, instance=project)
        if form.is_valid():
            # check if project with same name already exists for this user
            if Project.objects.filter(name=form.cleaned_data['name'], user=request.user).exclude(id=project.id).exists():
                form.add_error(
                    "name", "A project with this name already exists for this user."
                )
                return render(request, "tmnt/edit_project.html", {"form": form, "project_name": project_name})
            else:
                form.save()
                return HttpResponseRedirect('/view_projects/')
        else:
            # if form is not valid, render the form again with errors
            return render(request, "tmnt/edit_project.html", {"form": form, "project_name": project_name})
    else:
        project = get_object_or_404(Project, name=project_name, user=request.user)
        form = NewProjectForm(instance=project)
        return render(request, "tmnt/edit_project.html", {"form": form, "project_name": project_name})

# view for uploading file
def upload_file(request):
    # checks to see if request method is POST which means form is submitted
    if request.method == "POST":
        # request.POST has form data, request.FILE has file data
        fileform = UploadDFDFileForm(request.POST, request.FILES)

        # first, check that the user actually submitted something
        if fileform.is_valid():
            tm_file = None

            # if yes...
            # did they submit a file?
            if "inputFile" in request.FILES.keys():
                # then get the file
                print("DEBUG >>>> using FILE")
                tm_file = request.FILES["inputFile"].file

            # # or did they submit via the textbox?
            else:
                # then get the text and treat it like a file
                print("DEBUG >>>> using TEXT")
                tm_file = io.BytesIO(
                    (request.POST["inputText"])
                    .replace("\r", "")
                    .encode("ascii")
                )

            # now save whatever they gave us to our own local file...
            DIR = os.path.dirname(__file__)
            with open(os.path.join(DIR, "scripts", "tm.py"), "wb") as f:
                f.write(tm_file.read())

            # ...and run pytm on it to generate a threat model image
            # run /mnt/c/Users/miraj/Desktop/study/capstone/ntmt_github/pytm_web/scripts/tm.py --dfd | dot -Tpng -o sample.png
            ps = subprocess.Popen(
                (os.path.join(DIR, "scripts", "tm.py"), "--dfd"),
                stdout=subprocess.PIPE,
            )
            _ = subprocess.check_output(
                ("dot", "-Tpng", "-o", os.path.join(DIR, "static", "out.png")),
                stdin=ps.stdout,
            )

            # os.remove(os.path.join(DIR, 'static', 'out.png'))

            # then render the new page
            return render(
                request, "tmnt/dfd_viewer.html", {"fileform": fileform}
            )

    else:
        # if request method is not POST, make an empty form
        fileform = UploadDFDFileForm()
        # renders template upload.html, passing in the form
        # NEED TO IMPLEMENT upload.html TEMPLATE
    return render(request, "tmnt/dfd_viewer.html", {"fileform": fileform})


def workspace(request, project_name):
    # print('User:', request.user)
    project_name = get_object_or_404(Project, name=project_name, user=request.user)
    experiment_mode = project_name.experiment_mode
    return render(request, "tmnt/asset_viewer.html", locals())

def add_entity(request):
    status_code = 500
    name = request.POST.get("name")
    type = request.POST.get("type")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    # print(f'add_entity received type: {type}')
    if project.experiment_mode:
        return JsonResponse({"error": "Adding entities forbidden in experiment mode."}, status=409)
    if type == "Actor":
        status_code = add_entity_actor(request, project)
    elif type == "Datastore":
        status_code = add_entity_datastore(request, project)
    elif type == "Server" or type == "Process" or type == "Lambda":
        new_entity = Entity(name=name, project=project, type=type)
        new_entity.save()
        ua = UserAction(username=request.user, project=project, action=f'create {type}', entities=name)
        ua.save()
        return JsonResponse(200, safe=False)
    elif type == "Boundary":
        status_code = add_entity_boundary(request, project)
    elif type == "Dataflow":
        status_code = add_entity_dataflow(request, project)
    else:
        print(f"ERROR: unrecognized type: {type}")
        status_code = 500
    return JsonResponse(status_code, safe=False)  # return error

def add_entity_actor(request, project: Project) -> int:
    actor_name = request.POST.get("name")
    actor_type = request.POST.get("actor_type")
    # print(actor_name)
    # print(actor_type)
    # update model
    priv_level = request.POST.get("priv_level")  # ADD FIELD TO REQUEST

    comments = request.POST.get("comments")
    # first create Entity, then create Actor to store add'l info
    with transaction.atomic():
        new_entity = Entity(name=actor_name, project=project, comments='', type="Actor")
        new_entity.save()
        new_actor = Actor(name=actor_name, project=project, parent_entity=new_entity, priv_level=priv_level)
        new_actor.save()
        ua = UserAction(username=request.user, project=project, action=f'create actor', entities=actor_name, details=f'Actor type: {actor_type}; priv_level: {priv_level}; Comments: {comments}')
        ua.save()

    return 200

def add_entity_boundary(request, project: Project) -> int:
    name = request.POST.get("name")
    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    with transaction.atomic():
        # grab names of all actors, then grab those actors
        entity_names = request.POST.getlist("entity_names[]")
        print(f'add_entity_boundary received entity_names: {entity_names}')
        entities = Entity.objects.filter(name__in=entity_names)
        tb = TrustBoundary(name=name, project=project, actor_name=actor_name, actor_type=actor_type)
        tb.save()
        # add assets to trust boundary
        tb.entities.add(*entities)
        tb.save()
        ua = UserAction(username=request.user, project=project, action=f'create boundary', entities=str(entity_names),
                        details=f'Actor type: {actor_type}; Actor name: {actor_name}')
        ua.save()

    return 200


def add_entity_datastore(request, project: Project) -> int:
    name = request.POST.get("name")
    print('Datastore name:', name)
    ports = request.POST.get("open_ports")

    machine_type = request.POST.get("machine_type")
    datastore_type = request.POST.get("ds_type")
    with transaction.atomic():
        parent_entity = Entity(name=name, project=project, comments='', type="Data Store")
        parent_entity.save()
        actor_names = [name for name in request.POST.getlist("actor_names") if name != ""]
        actors = Entity.objects.filter(name__in=actor_names, project=project)
        tb_names = [name for name in request.POST.getlist("tb_names") if name != ""]
        tbs = TrustBoundary.objects.filter(name__in=tb_names, project=project)
        ds = Datastore(parent_entity=parent_entity, project=project, ports=ports, machine_type=machine_type, data_type=datastore_type)
        # add actors, tbs
        # ds.actors.add(*actors)
        # ds.trust_boundaries.add(tbs)
        ds.save()
        ua = UserAction(username=request.user, project=project, action=f'create datastore', entities=name, details='')
        ua.save()
    # response_status = controller_client.AddDatastore(datastore_request)

    return 200

def add_externalasset(request):
    name = request.POST.get("name")
    open_ports_str = request.POST.get("open_port")
    machine_type = request.POST.get("machine_type")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    if project.experiment_mode:
        return JsonResponse({"error": "Adding entities forbidden in experiment mode."}, status=409)
    # machine = Machine.PHYSICAL
    # if machine_type == "Virtual":
    #     machine = Machine.VIRTUAL
    # elif machine_type == "Container":
    #     machine = Machine.CONTAINER
    # elif machine_type == "Serverless":
    #     machine = Machine.SERVERLESS
    with transaction.atomic():
        entity = Entity(name=name, project=project, comments='', type="External Entity")
        entity.save()
        ext = ExtAsset(name=name, project=project, ports=open_ports_str, machine_type=machine_type, parent_entity=entity, type="External Entity")
        ext.save()
        ua = UserAction(username=request.user, project=project, action=f'create externalasset', entities=name, details=f'Open ports: {open_ports_str}; Machine type: {machine_type}')
        ua.save()
    # addexternalasset_request = AddExternalAssetRequest(
    #     name=name,
    #     open_ports=open_ports,
    #     machine=machine
    # )
    # response_status = controller_client.AddExternalAsset(
    #     addexternalasset_request
    # )

    return JsonResponse(200, safe=False)

def rename_dataflow(request):
    old_name = request.POST.get("old_name")
    new_name = request.POST.get("new_name")
    source = request.POST.get("source")
    dest = request.POST.get("dest")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    if project.experiment_mode:
        return JsonResponse({"error": "Renaming dataflows forbidden in experiment mode."}, status=409)
    with transaction.atomic():
        DataFlow.objects.filter(source__name=source, dest__name=dest, project=project).update(name=new_name)
        ua = UserAction(username=request.user, project=project, action=f"rename dataflow {old_name} -> {new_name}",
                        entities=new_name)
        ua.save()
    return JsonResponse({"status": "ok"}, status=200)

def rename_entity(request):
    old_name = request.POST.get("old_name")
    new_name = request.POST.get("new_name")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    if project.experiment_mode:
        return JsonResponse({"error": "Renaming entities forbidden in experiment mode."}, status=409)
    if not old_name or not new_name:
        return JsonResponse({"error": "missing old_name or new_name"}, status=400)

    try:
        entity = Entity.objects.get(name=old_name, project=project)
    except Entity.DoesNotExist:
        return JsonResponse({"error": "entity not found"}, status=404)

    # Prevent name collisions
    if Entity.objects.filter(name=new_name, project=project).exclude(id=entity.id).exists():
        return JsonResponse({"error": "an entity with the new name already exists"}, status=409)

    with transaction.atomic():
        # Rename the canonical Entity
        entity.name = new_name
        entity.save()

        # Update models that duplicate the entity name in their own 'name' field and reference the entity
        Actor.objects.filter(parent_entity=entity, project=project).update(name=new_name)
        ExtAsset.objects.filter(parent_entity=entity, project=project).update(name=new_name)
        Datastore.objects.filter(parent_entity=entity, project=project).update(name=new_name)

        # Update TrustBoundary.actor_name if it stores the actor name as a string
        TrustBoundary.objects.filter(project=project, actor_name=old_name).update(actor_name=new_name)

        # Log this change as a new UserAction
        ua = UserAction(username=request.user, project=project, action=f"rename entity {old_name} -> {new_name}",
                        entities=new_name)
        ua.save()

    return JsonResponse({"status": "ok"}, status=200)


def delete_asset(request):
    response_code = 200
    name = request.POST.get("name")
    asset_type = request.POST.get("type")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    if project.experiment_mode:
        return JsonResponse({"error": "Deleting assets forbidden in experiment mode."}, status=409)
    Entity.objects.filter(name=name, project=project).delete()  # delete the parent entity
    # below code shouldn't be necessary if foreign key on delete cascade works properly
    # if asset_type == "Process" or asset_type == "Lambda" or asset_type == "Server":
    #     Entity.objects.filter(name=name, project=project).delete()
    if asset_type == "Actor":
        Actor.objects.filter(name=name, project=project).delete()
    elif asset_type == "Data Store":
        Datastore.objects.filter(name=name, project=project).delete()
    elif asset_type == "External Entity": # external asset
        ExtAsset.objects.filter(name=name, project=project).delete()
    elif asset_type == "Dataflow":
        source = request.POST.get("source")
        dest = request.POST.get("dest")
        print("Deleting dataflow:", name, "source:", source, "dest:", dest)
        DataFlow.objects.filter(name=name, source__name=source, dest__name=dest, project=project).delete()
    elif asset_type == "Boundary":
        TrustBoundary.objects.filter(name=name, project=project).delete()
    elif asset_type == "Threat":
        Threat.objects.filter(name=name, project=project).delete()
    elif asset_type == "Assumption":
        Assumption.objects.filter(name=name, project=project).delete()
    elif asset_type == "Workflow":
        Workflow.objects.filter(name=name, project=project).delete()
    else:
        print(f"ERROR: unrecognized type: {asset_type}")
        return JsonResponse(500, safe=False)
    ua = UserAction(username=request.user, project=project, action=f'delete {asset_type}', entities=name)
    ua.save()

    return JsonResponse(response_code, safe=False)

def delete_all_assets(request):
    # does not include UserAction insert because this is just for testing
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    Entity.objects.filter(project=project).delete()
    TrustBoundary.objects.filter(project=project).delete()
    DataFlow.objects.filter(project=project).delete()
    ExtAsset.objects.filter(project=project).delete()
    Assumption.objects.filter(project=project).delete()
    Threat.objects.filter(project=project).delete()
    Control.objects.filter(project=project).delete()
    Workflow.objects.filter(project=project).delete()
    return JsonResponse(200, safe=False)

def add_entity_dataflow(request, project: Project) -> int:
    source_name = request.POST.get("source")
    dest_name = request.POST.get("target")
    name = request.POST.get("name")
    source = Entity.objects.get(name=source_name, project=project)
    dest = Entity.objects.get(name=dest_name, project=project)
    with transaction.atomic():
        df = DataFlow(source=source, dest=dest, name=name, project=project)
        df.save()
        ua = UserAction(username=request.user, project=project, action=f'create dataflow', entities=name, details=f'Source: {source_name}; Destination: {dest_name}')
        ua.save()
    return 200


def edit_boundary(request):
    name = request.POST.get("name")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    # actor_name = request.POST.get("actor_name")
    # actor_type = request.POST.get("actor_type")

    # grab names of all actors, then grab those actors
    entity_names = request.POST.getlist("entity_names[]")
    # print('TB entity names:', entity_names)
    # print('TB name:', name)
    with transaction.atomic():
        entities = Entity.objects.filter(name__in=entity_names, project=project)
        tb = TrustBoundary.objects.get(name=name, project=project)
        tb.entities.clear()  # clear existing entities
        tb.entities.add(*entities)  # add new entities
        tb.save()
        ua = UserAction(username=request.user, project=project, action=f'edit boundary', entities=name, details=f'Entity names: {entity_names}')
        ua.save()
    return JsonResponse(200, safe=False)

def add_threat(request):
    name = request.POST.get("name")
    assets = request.POST.getlist("assets[]")
    cve_id = request.POST.get("cve_id")
    stride_class = request.POST.get("stride_class")
    severity = request.POST.get("severity")
    description = request.POST.get("description")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    with transaction.atomic():
        threat = Threat(name=name, project=project, stride_class=stride_class, cve_id=cve_id, severity=severity, description=description)
        threat.save()
        entities = Entity.objects.filter(name__in=assets, project=project)
        # print(entities)
        threat.assets.add(*entities)
        threat.save()
        ua = UserAction(username=request.user, project=project, action=f'create threat', entities=name, details=f'Assets: {assets}; STRIDE: {stride_class}; Severity: {severity}; Descr: {description}')
        ua.save()
    return JsonResponse(200, safe=False)

def edit_threat(request):
    # TODO: this is a stub, remains unimplemented & unused
    name = request.POST.get("name")
    pass

def delete_threat(request):
    name = request.POST.get("name")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    threat = Threat.objects.get(name=name, project=project)
    with transaction.atomic():
        threat.delete()
        ua = UserAction(username=request.user, project=project, action=f'delete threat', entities=name)
        ua.save()
    return JsonResponse(200, safe=False)

def add_assumption(request):
    # name = request.POST.get("name")
    assets = request.POST.getlist("assets[]")
    threats = request.POST.getlist("threats[]")
    comments = request.POST.get("description")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    
    with transaction.atomic():
        assump = Assumption(comments=comments, project=project)
        assump.save()  # Gets its database ID here
        
        assets = Entity.objects.filter(name__in=assets, project=project)
        threats = Threat.objects.filter(name__in=threats, project=project)
        assump.assets.add(*assets)
        assump.threats.add(*threats)
        assump.save()
        
        ua = UserAction(username=request.user, project=project, action=f'create assumption', entities=comments,
                        details=f'Assets: {assets}; Threats: {threats}')
        ua.save()
        
    return JsonResponse({"status": 200, "id": assump.id})

def edit_assumption(request):
    name = request.POST.get("name")
    assets = request.POST.getlist("assets[]")
    threats = request.POST.getlist("threats[]")
    comments = request.POST.get("comments")
    with transaction.atomic():
        assump = Assumption.objects.get(name=name)
        # TODO: ideally, determine which things have changed (e.g., leave unchanged fields blank in request)
        # TODO: add UserAction for this
    pass

def delete_assumption(request):
    # Retrieve the id passed from the frontend AJAX call
    assumption_id = request.POST.get("id")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    
    with transaction.atomic():
        # Query by the exact database ID
        assump = Assumption.objects.filter(id=assumption_id, project=project).first()
        
        if assump:
            # Store the text temporarily so we can still log it in UserAction
            comments = assump.comments 
            assump.delete()
            
            ua = UserAction(username=request.user, project=project, action='delete assumption', entities=comments)
            ua.save()
            
    return JsonResponse(200, safe=False)

def add_control(request):
    name = request.POST.get("name")
    description = request.POST.get("description")
    asset_names = request.POST.getlist("assets[]")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)

    with transaction.atomic():
        # Try to find existing control
        control, created = Control.objects.get_or_create(
            name=name,
            project=project,
            defaults={"description": description}
        )

        # If control exists but description changed, optionally update it
        if not created and description and control.description != description:
            control.description = description
            control.save()

        # Add new assets
        assets = Entity.objects.filter(name__in=asset_names, project=project)
        control.assets.add(*assets)
        control.save()

        ua = UserAction(
            username=request.user,
            project=project,
            action='create or update control',
            entities=name,
            details=f'Assets: {asset_names}; Description: {description}'
        )
        ua.save()

    return JsonResponse(200, safe=False)

def edit_control(request):
    change = request.POST.get("change")  # e.g., "name", "description", "assets"
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    if change == "assoc threat":
        # associate control with threat
        return associate_control_with_threat(request, project)
    elif change == "disassoc threat":
        return associate_control_with_threat(request, project, True)
    return JsonResponse(501, safe=False)

def delete_control(request):
    name = request.POST.get("name")
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    control = Control.objects.get(name=name, project=project)
    with transaction.atomic():
        control.delete()
        ua = UserAction(username=request.user, project=project, action=f'delete control', entities=name)
        ua.save()
    return JsonResponse(200, safe=False)

def associate_control_with_threat(request, project: Project, dissociate=False):
    threat_name = request.POST.get("threat_name")
    control_name = request.POST.get("control_name")
    asset_name = request.POST.get("asset_name")
    print(f'associate_control_with_threat received threat: {threat_name}, control: {control_name}, dissociate: {dissociate}')
    threat = Threat.objects.get(name=threat_name, project=project)
    control = Control.objects.get(name=control_name, project=project)
    asset = Entity.objects.get(name=asset_name, project=project)
    with transaction.atomic():
        if dissociate:
            mt = MitigatedThreat.objects.get(asset=asset, control=control, threat=threat, project=project)
            mt.delete()
            control.threats.remove(threat)
            control.save()
            ua = UserAction(username=request.user, project=project, action=f'dissociate control from threat', entities=control_name, details=f'Threat: {threat_name}; Asset: {asset_name}')
            ua.save()
        else:
            mt = MitigatedThreat(asset=asset, control=control, threat=threat, project=project)
            mt.save()
            control.threats.add(threat)
            control.save()
            ua = UserAction(username=request.user, project=project, action=f'associate control with threat', entities=control_name, details=f'Threat: {threat_name}; Asset: {asset_name}')
            ua.save()
    return JsonResponse(200, safe=False)

def update_node_position(request):
    name = request.POST.get("name")
    x = float(request.POST.get("x"))
    y = float(request.POST.get("y"))
    project = get_object_or_404(Project, name=request.POST.get("project_name"), user=request.user)
    print('received entity name:', name)
    entity = Entity.objects.get(name=name, project=project)
    print(f'update_node_position received name: {name}, x: {x}, y: {y}')
    try:
        d3pos = D3NodePosition.objects.get(entity=entity)
        d3pos.x = x
        d3pos.y = y
        d3pos.save()
    except D3NodePosition.DoesNotExist:
        d3pos = D3NodePosition(entity=entity, x=x, y=y)
        d3pos.save()
    return JsonResponse(200, safe=False)


def load_dfd(request, project_name):
    project = get_object_or_404(Project, name=project_name, user=request.user)  # get unique project object
    boundary = []
    for tb in list(TrustBoundary.objects.filter(project=project).values('name')):
        boundary.append({'name': tb['name'], 'entities': [obj.name for obj in TrustBoundary.objects.get(name=tb['name']).entities.all()]})
    threats = []
    for t in list(Threat.objects.filter(project=project).values('name', 'cve_id', 'stride_class', 'severity', 'description')):
        mitigated = Control.objects.filter(threats__id=Threat.objects.get(name=t['name']).id).exists()
        print(f'Threat {t["name"]} mitigated: {mitigated}')
        threats.append({'name': t['name'], 'cve_id': t['cve_id'], 'stride_class': t['stride_class'],
                        'severity': t['severity'], 'description': t['description'], 'assets':
                            [obj.name for obj in Threat.objects.get(name=t['name']).assets.all()], 'mitigated': mitigated})
    controls = []
    for c in list(Control.objects.filter(project=project).values('name', 'description')):
        control_assets = [obj.name for obj in Control.objects.get(name=c['name'], project=project).assets.all()]
        # check if the control has any associated threats
        # mitigated = Control.objects.get(name=c['name']).threats.exists()
        # create a list called "mitigated_assets" that contains the names of all assets that are associated with this control stored in models.MitigatedThreat
        mitigated_assets = list(MitigatedThreat.objects.filter(control__name=c['name'], project=project).values_list('asset__name', flat=True))
        controls.append({'name': c['name'], 'description': c['description'], 'assets': control_assets, 'mitigated_assets': mitigated_assets})
    assumptions = []
    for assump_obj in Assumption.objects.filter(project=project):
        assumptions.append({
            'id': assump_obj.id,
            'comments': assump_obj.comments, 
            'assets': [asset.name for asset in assump_obj.assets.all()], 
            'threats': [threat.name for threat in assump_obj.threats.all()]
        })
    # get entities and x,y positions (if stored)
    entities = Entity.objects.filter(project=project).values()
    # for each entity in entities, get its x,y position from D3NodePosition (if it exists)
    entities_with_coords = Entity.objects.filter(project=project).select_related(None).values(
        'name', 'type','d3_node_positions__x', 'd3_node_positions__y'
    )
    # this should get the x,y positions of each entity from D3NodePosition model, if corresponding entries exist
    data = {'entity': list(entities_with_coords),
            'boundary': boundary,
            'dataflow': list(DataFlow.objects.filter(project=project).values('source__name', 'dest__name', 'name')),
            'threats': threats,
            'controls': controls,
            'mitigated_threats': list(MitigatedThreat.objects.filter(project=project).values('asset__name', 'threat__name', 'control__name')),
            'assumptions': assumptions,
            }
    return JsonResponse(data, safe=False)
