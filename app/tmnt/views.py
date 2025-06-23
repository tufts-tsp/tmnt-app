from django.shortcuts import render
from .forms import UploadDFDFileForm
from .scripts.img_test import *
from .models import *
from django.db import transaction
import io
import os
import subprocess
from django.http import JsonResponse

import grpc
from controller_pb2_grpc import ControllerStub

controller_host = os.getenv("CONTROLLER_HOST", "localhost")
controller_channel = grpc.insecure_channel(f"{controller_host}:50051")
controller_client = ControllerStub(controller_channel)


# base editor view
def test(request):
    # generate() # generate random color cat picture
    return render(request, "tmnt/test.html")


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


def workspace(request):
    return render(request, "tmnt/asset_viewer.html")

def add_entity(request):
    status_code = 500
    name = request.POST.get("name")
    type = request.POST.get("type")
    print(f'add_entity received type: {type}')
    # try:
    if type == "Actor":
        status_code = add_entity_actor(request)
    elif type == "Datastore":
        status_code = add_entity_datastore(request)
    elif type == "Server" or type == "Process" or type == "Lambda":
        new_entity = Entity(name=name, type=type)
        new_entity.save()
        ua = UserAction(username='', action=f'create {type}', entities=name)
        ua.save()
        return JsonResponse(200, safe=False)
    elif type == "Boundary":
        status_code = add_entity_boundary(request)
    elif type == "Dataflow":
        status_code = add_entity_dataflow(request)
    else:
        print(f"ERROR: unrecognized type: {type}")
        status_code = 500
    # except Exception as e:
    #     print('Exception in add_entity:', e)
    #     status_code =
    return JsonResponse(status_code, safe=False)  # return error

def add_entity_actor(request) -> int:
    actor_name = request.POST.get("name")
    actor_type = request.POST.get("actor_type")
    print(actor_name)
    print(actor_type)
    # update model
    priv_level = request.POST.get("priv_level")  # ADD FIELD TO REQUEST

    # TODO: add line to get comments, after we have added comments functionality in interface.js
    comments = request.POST.get("comments")
    # first create Entity, then create Actor to store add'l info
    with transaction.atomic():
        new_entity = Entity(name=actor_name, comments='', type="Actor")
        new_entity.save()
        new_actor = Actor(name=actor_name, parent_entity=new_entity, priv_level=priv_level)
        new_actor.save()
        ua = UserAction(username='', action=f'create actor', entities=actor_name, details=f'Actor type: {actor_type}; priv_level: {priv_level}; Comments: {comments}')
        ua.save()

    return 200

def add_entity_boundary(request) -> int:
    name = request.POST.get("name")
    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    with transaction.atomic():
        # grab names of all actors, then grab those actors
        entity_names = request.POST.getlist("entity_names[]")
        print(f'add_entity_boundary received entity_names: {entity_names}')
        entities = Entity.objects.filter(name__in=entity_names)
        tb = TrustBoundary(name=name, actor_name=actor_name, actor_type=actor_type)
        tb.save()
        # add assets to trust boundary
        tb.entities.add(*entities)
        tb.save()
        ua = UserAction(username='', action=f'create boundary', entities=str(entity_names),
                        details=f'Actor type: {actor_type}; Actor name: {actor_name}')
        ua.save()

    return 200


def add_entity_datastore(request) -> int:
    name = request.POST.get("name")
    # below not required if we're going to store ports as a comma-delimited string
    # open_ports_str = request.POST.get("open_ports").split(",")
    # open_ports = []
    # for port in open_ports_str:
    #     open_ports.append(int(port))
    ports = request.POST.get("open_ports")

    machine_type = request.POST.get("machine_type")
    # machine = Machine.PHYSICAL
    # if machine_type == "Virtual":
    #     machine = Machine.VIRTUAL
    # elif machine_type == "Container":
    #     machine = Machine.CONTAINER
    # elif machine_type == "Serverless":
    #     machine = Machine.SERVERLESS
    datastore_type = request.POST.get("ds_type")
    #
    # trust_boundaries = [boundary]
    # datastore_request = AddDatastoreRequest(
    #     name=boundary_name,
    #     open_ports=open_ports,
    #     trust_boundary=trust_boundaries,
    #     machine=machine,
    #     ds_type=datastore_type,
    # )
    # create parent entity
    with transaction.atomic():
        parent_entity = Entity(name=name, comments='', type="Data Store")
        parent_entity.save()
        actor_names = [name for name in request.POST.getlist("actor_names") if name != ""]
        actors = Entity.objects.filter(name__in=actor_names)
        tb_names = [name for name in request.POST.getlist("tb_names") if name != ""]
        tbs = TrustBoundary.objects.filter(name__in=tb_names)
        ds = Datastore(parent_entity=parent_entity, ports=ports, machine_type=machine_type, data_type=datastore_type)
        # add actors, tbs
        # ds.actors.add(*actors)
        # ds.trust_boundaries.add(tbs)
        ds.save()
        ua = UserAction(username='', action=f'create datastore', entities=name, details='')
        ua.save()
    # response_status = controller_client.AddDatastore(datastore_request)

    return 200

def add_externalasset(request):
    name = request.POST.get("name")
    open_ports_str = request.POST.get("open_port")
    machine_type = request.POST.get("machine_type")
    # machine = Machine.PHYSICAL
    # if machine_type == "Virtual":
    #     machine = Machine.VIRTUAL
    # elif machine_type == "Container":
    #     machine = Machine.CONTAINER
    # elif machine_type == "Serverless":
    #     machine = Machine.SERVERLESS

    ext = ExtAsset(name=name, open_ports=open_ports_str, machine_type=machine_type)
    ext.save()
    ua = UserAction(username='', action=f'create externalasset', entities=name, details=f'Open ports: {open_ports_str}; Machine type: {machine_type}')
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

def delete_asset(request):
    response_code = 200
    name = request.POST.get("name")
    asset_type = request.POST.get("type")
    # TODO: wrap in try-except and send non-200 response on failure
    # below code shouldn't be necessary if foreign key on delete cascade works properly
    if asset_type == "Process" or asset_type == "Lambda" or asset_type == "Server":
        Entity.objects.filter(name=name).delete()
    elif asset_type == "Actor":
        Actor.objects.filter(name=name).delete()
    elif asset_type == "Data Store":
        Datastore.objects.filter(name=name).delete()
    elif asset_type == "External Entity": # external asset
        ExtAsset.objects.filter(name=name).delete()
    elif asset_type == "Dataflow":
        DataFlow.objects.filter(name=name).delete()
    elif asset_type == "Boundary":
        TrustBoundary.objects.filter(name=name).delete()
    elif asset_type == "Threat":
        Threat.objects.filter(name=name).delete()
    elif asset_type == "Assumption":
        Assumption.objects.filter(name=name).delete()
    elif asset_type == "Workflow":
        Workflow.objects.filter(name=name).delete()
    else:
        print(f"ERROR: unrecognized type: {asset_type}")
        return JsonResponse(500, safe=False)
    ua = UserAction(username='', action=f'delete {asset_type}', entities=name)
    ua.save()

    return JsonResponse(response_code, safe=False)

def delete_all_assets(request):
    # does not include UserAction insert because this is just for testing
    Entity.objects.all().delete()
    TrustBoundary.objects.all().delete()
    DataFlow.objects.all().delete()
    ExtAsset.objects.all().delete()
    Assumption.objects.all().delete()
    Threat.objects.all().delete()
    Control.objects.all().delete()
    Workflow.objects.all().delete()
    return JsonResponse(200, safe=False)

def add_entity_dataflow(request) -> int:
    source_name = request.POST.get("source")
    dest_name = request.POST.get("target")
    name = request.POST.get("name")
    source = Entity.objects.get(name=source_name)
    dest = Entity.objects.get(name=dest_name)
    # print(request.POST)
    # print(f'source: {source}, dest: {dest}')
    with transaction.atomic():
        df = DataFlow(source=source, dest=dest, name=name)
        df.save()
        ua = UserAction(username='', action=f'create dataflow', entities=name, details=f'Source: {source_name}; Destination: {dest_name}')
        ua.save()
    return 200


def edit_boundary(request):
    name = request.POST.get("name")
    # actor_name = request.POST.get("actor_name")
    # actor_type = request.POST.get("actor_type")

    # grab names of all actors, then grab those actors
    entity_names = request.POST.getlist("entity_names[]")
    # print('TB entity names:', entity_names)
    # print('TB name:', name)
    with transaction.atomic():
        entities = Entity.objects.filter(name__in=entity_names)
        tb = TrustBoundary.objects.get(name=name)
        # add assets to trust boundary
        tb.entities.set(*entities)
        tb.save()
        ua = UserAction(username='', action=f'edit boundary', entities=name, details=f'Entity names: {entity_names}')
        ua.save()

def add_threat(request):
    name = request.POST.get("name")
    assets = request.POST.getlist("assets[]")
    cve_id = request.POST.get("cve_id")
    stride_class = request.POST.get("stride_class")
    severity = request.POST.get("severity")
    description = request.POST.get("description")
    with transaction.atomic():
        threat = Threat(name=name, stride_class=stride_class, cve_id=cve_id, severity=severity, description=description)
        threat.save()
        entities = Entity.objects.filter(name__in=assets)
        print(entities)
        threat.assets.add(*entities)
        threat.save()
        ua = UserAction(username='', action=f'create threat', entities=name, details=f'Assets: {assets}; STRIDE: {stride_class}; Severity: {severity}; Descr: {description}')
        ua.save()
    return JsonResponse(200, safe=False)

def edit_threat(request):
    name = request.POST.get("name")
    pass

def delete_threat(request):
    name = request.POST.get("name")
    threat = Threat.objects.get(name=name)
    with transaction.atomic():
        threat.delete()
        ua = UserAction(username='', action=f'delete threat', entities=name)
        ua.save()
    return JsonResponse(200, safe=False)

def add_assumption(request):
    name = request.POST.get("name")
    assets = request.POST.getlist("assets[]")
    threats = request.POST.getlist("threats[]")
    comments = request.POST.get("comments")
    with transaction.atomic():
        assump = Assumption(name=name, comments=comments)
        # assump.save()  # not sure if save is necessary
        assets = Entity.objects.filter(name__in=assets)
        threats = Threat.objects.filter(name__in=threats)
        assump.assets.set(*assets)
        assump.threats.set(*threats)
        assump.save()
        ua = UserAction(username='', action=f'create assumption', entities=name,
                        details=f'Assets: {assets}; Threats: {threats} Comments: {comments}')
        ua.save()
    return JsonResponse(200, safe=False)

def edit_assumption(request):
    name = request.POST.get("name")
    assets = request.POST.getlist("assets[]")
    threats = request.POST.getlist("threats[]")
    comments = request.POST.get("comments")
    with transaction.atomic():
        assump = Assumption.objects.get(name=name)
        # TODO: ideally, determine which things have changed (e.g., leave unchanged fields blank in request)
    pass

def delete_assumption(request):
    name = request.POST.get("name")
    assump = Assumption.objects.get(name=name)
    with transaction.atomic():
        assump.delete()
        ua = UserAction(username='', action=f'delete assumption', entities=name)
        ua.save()
    return JsonResponse(200, safe=False)

def add_control(request):
    name = request.POST.get("name")
    description = request.POST.get("description")
    assets = request.POST.getlist("assets[]")
    with transaction.atomic():
        control = Control(name=name, description=description)
        control.save()
        assets = Entity.objects.filter(name__in=assets)
        print('add_control received assets:', len(assets), assets)
        control.assets.add(*assets)
        control.save()
        ua = UserAction(username='', action=f'create control', entities=name, details=f'Assets: {assets}; Description: {description}')
        ua.save()
    return JsonResponse(200, safe=False)

def edit_control(request):
    change = request.POST.get("change")  # e.g., "name", "description", "assets"
    if change == "assoc threat":
        # associate control with threat
        return associate_control_with_threat(request)
    elif change == "disassoc threat":
        return associate_control_with_threat(request, True)
    return JsonResponse(501, safe=False)

def delete_control(request):
    name = request.POST.get("name")
    control = Control.objects.get(name=name)
    with transaction.atomic():
        control.delete()
        ua = UserAction(username='', action=f'delete control', entities=name)
        ua.save()
    return JsonResponse(200, safe=False)

def associate_control_with_threat(request, dissociate=False):
    threat_name = request.POST.get("threat_name")
    control_name = request.POST.get("control_name")
    print(f'associate_control_with_threat received threat: {threat_name}, control: {control_name}, dissociate: {dissociate}')
    threat = Threat.objects.get(name=threat_name)
    control = Control.objects.get(name=control_name)
    with transaction.atomic():
        if dissociate:
            control.threats.remove(threat)
            control.save()
            ua = UserAction(username='', action=f'dissociate control from threat', entities=control_name, details=f'Threat: {threat_name}')
            ua.save()
        else:
            control.threats.add(threat)
            control.save()
            ua = UserAction(username='', action=f'associate control with threat', entities=control_name, details=f'Threat: {threat_name}')
            ua.save()
    return JsonResponse(200, safe=False)


def load_dfd(request):
    boundary = []
    for tb in list(TrustBoundary.objects.values('name')):
        boundary.append({'name': tb['name'], 'entities': [obj.name for obj in TrustBoundary.objects.get(name=tb['name']).entities.all()]})
    threats = []
    for t in list(Threat.objects.values('name', 'cve_id', 'stride_class', 'severity', 'description')):
        mitigated = Control.objects.filter(threats__id=Threat.objects.get(name=t['name']).id).exists()
        print(f'Threat {t["name"]} mitigated: {mitigated}')
        threats.append({'name': t['name'], 'cve_id': t['cve_id'], 'stride_class': t['stride_class'],
                        'severity': t['severity'], 'description': t['description'], 'assets':
                            [obj.name for obj in Threat.objects.get(name=t['name']).assets.all()], 'mitigated': mitigated})
    controls = []
    for c in list(Control.objects.values('name', 'description')):
        control_assets = [obj.name for obj in Control.objects.get(name=c['name']).assets.all()]
        # check if the control has any associated threats
        mitigated = Control.objects.get(name=c['name']).threats.exists()
        controls.append({'name': c['name'], 'description': c['description'], 'assets': control_assets, 'mitigated': mitigated})
    data = {'entity': list(Entity.objects.values()),
            'boundary': boundary,
            'dataflow': list(DataFlow.objects.values('source__name', 'dest__name')),
            'threats': threats,
            'controls': controls,
            'assumptions': [], #list(Assumption.objects.values('name', 'comments', 'assets__name', 'threats__name')),
            }
    return JsonResponse(data, safe=False)
