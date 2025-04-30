from django.shortcuts import render
from .forms import UploadDFDFileForm
from .scripts.img_test import *
from .models import *
import io
import os
import subprocess
from django.http import JsonResponse

import grpc
# from controller_pb2 import (
#     Machine,
#     Datastore_Type,
#     Empty,
#     Status,
#     Status_Code,
#     Actor,
#     RemoveActorRequest,
#     AddServerRequest,
#     RemoveServerRequest,
#     Boundary,
#     RemoveBoundaryRequest,
#     AddAssetRequest,
#     RemoveAssetRequest,
#     AddExternalAssetRequest,
#     RemoveExternalAssetRequest,
#     AddDatastoreRequest,
#     RemoveDatastoreRequest,
#     AddProcessRequest,
#     RemoveProcessRequest,
#     AddLambdaRequest,
#     RemoveLambdaRequest,
#     ExportRequest,
#     ImportRequest,
#     Event_Type,
#     Event,
# )
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


def add_actor(request):
    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    print(actor_name)
    print(actor_type)
    # update model
    priv_level = request.POST.get("priv_level")  # ADD FIELD TO REQUEST

    # add line to get comments, after we have added comments functionality in interface.js
    new_actor = Actor(name=actor_name, priv_level=priv_level, comments='')
    new_actor.save()

    # actor = Actor(
    #     name=actor_name, actor_type=actor_type
    # )

    # response_status = controller_client.AddActor(actor)

    # return JsonResponse(response_status.code, safe=False)
    return JsonResponse(200, safe=False)

def add_server(request):
    server_name = request.POST.get("name")
    # update model
    server = Server(name=server_name)
    server.save()

    # server_request = AddServerRequest(
    #     name=server_name
    # )

    # response_status = controller_client.AddServer(server_request)

    return JsonResponse(200, safe=False)

def add_process(request):
    process_name = request.POST.get("name")
    # update model
    process = Process(name=process_name)
    process.save()

    # process_request = AddProcessRequest(
    #     name=process_name
    # )

    # response_status = controller_client.AddProcess(process_request)

    return JsonResponse(200, safe=False)

def add_lambda(request):
    lambda_name = request.POST.get("name")
    # update model
    lam = Lambda(name=lambda_name)
    lam.save()

    # lambda_request = AddLambdaRequest(
    #     name=lambda_name
    # )

    # response_status = controller_client.AddLambda(lambda_request)

    return JsonResponse(200, safe=False)


def add_boundary(request):
    name = request.POST.get("boundary_name")
    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")

    # actor = Actor(
    #     name=actor_name, actor_type=actor_type
    # )
    # boundary_name = request.POST.get("boundary_name")
    # boundary = Boundary(name=boundary_name, boundary_owner=actor)
    # TODO: update model
    tb = TrustBoundary(name=name, actor_name=actor_name, actor_type=actor_type)
    # TODO: add assets to trust boundary
    tb.save()

    # response_status = controller_client.AddBoundary(boundary)

    return JsonResponse(200, safe=False)


def add_datastore(request):
    name = request.POST.get("name")
    # open_ports_str = request.POST.get("open_ports").split(",")
    # open_ports = []
    # for port in open_ports_str:
    #     open_ports.append(int(port))
    open_ports_str = request.POST.get("open_ports")

    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    # actor = Actor(
    #     name=actor_name, actor_type=actor_type
    # )
    boundary_name = request.POST.get("boundary_name")
    # boundary = Boundary(name=boundary_name, boundary_owner=actor)
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
    # TODO: update model
    trust_boundary = TrustBoundary.objects.get(name=boundary_name)
    ds = Datastore(name=name, actor_name=actor_name, actor_type=actor_type, ports=open_ports_str,
                   machine_type=machine_type, data_type=datastore_type, trust_boundary=trust_boundary)
    ds.save()


    # response_status = controller_client.AddDatastore(datastore_request)

    return JsonResponse(200, safe=False)

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

    # TODO: update model
    ext = ExtAsset(name=name, open_ports=open_ports_str, machine_type=machine_type)
    ext.save()
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
    if asset_type == "Actor":
        Actor.objects.filter(name=name).delete()
    elif asset_type == "Server":
        Server.objects.filter(name=name).delete()
    elif asset_type == "Process":
        Process.objects.filter(name=name).delete()
    elif asset_type == "Lambda":
        Lambda.objects.filter(name=name).delete()
    elif asset_type == "Boundary":
        TrustBoundary.objects.filter(name=name).delete()
    elif asset_type == "Datastore":
        Datastore.objects.filter(name=name).delete()
    else: # external asset
        ExtAsset.objects.filter(name=name).delete()

    return JsonResponse(response_code, safe=False)

def delete_all_assets(request):
    Actor.objects.all().delete()
    Server.objects.all().delete()
    Process.objects.all().delete()
    Lambda.objects.all().delete()
    TrustBoundary.objects.all().delete()
    Datastore.objects.all().delete()
    ExtAsset.objects.all().delete()
    return JsonResponse(200, safe=False)

def add_dataflow(request):
    source = request.POST.get("source")
    dest = request.POST.get("target")
    name = request.POST.get("name")
    print(request.POST)
    print(f'source: {source}, dest: {dest}')
    df = DataFlow(source=source, dest=dest, name=name)
    df.save()

    return JsonResponse(200, safe=False)

def load_dfd(request):
    # data = {'actor' : list(Actor.objects.all()),
    #         'server': list(Server.objects.all()),
    #         'process': list(Process.objects.all()),
    #         'lambda': list(Lambda.objects.all()),
    #         'trustboundary': list(TrustBoundary.objects.all()),
    #         'datastore': list(Datastore.objects.all()),
    #         'extasset': list(ExtAsset.objects.all()),
    #         'dataflow': list(DataFlow.objects.all()),
    #         }
    print(list(Actor.objects.values()))
    print(list(DataFlow.objects.values()))
    data = {'assets': list(Actor.objects.values()) + list(Server.objects.values()) + list(Process.objects.values())
                      + list(Lambda.objects.values()) + list(TrustBoundary.objects.values()) + list(Datastore.objects.values())
                      + list(ExtAsset.objects.values()),
            'dataflows': list(DataFlow.objects.values()),
            }
    return JsonResponse(data, safe=False)
