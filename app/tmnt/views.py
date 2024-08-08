from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from contextlib import closing
import socket
import os
import grpc
from controller_pb2 import (
    Machine,
    Datastore_Type,
    Empty,
    Status,
    Status_Code,
    Actor,
    RemoveActorRequest,
    Boundary,
    RemoveBoundaryRequest,
    AddAssetRequest,
    RemoveAssetRequest,
    AddExternalAssetRequest,
    RemoveExternalAssetRequest,
    AddDatastoreRequest,
    RemoveDatastoreRequest,
    AddProcessRequest,
    RemoveProcessRequest,
    ExportRequest,
    ImportRequest,
    Event_Type,
    Event,
)
from controller_pb2_grpc import ControllerStub

def check_controller_status(host, port):
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        res = sock.connect_ex((host, port))
    if res == 0:
        return True
    return False

cntl_host = os.getenv("CONTROLLER_HOST", "localhost")
cntl_port = os.getenv("CONTROLLER_PORT", 5001)
cntl_channel = grpc.insecure_channel(f"{cntl_host}:{cntl_port}")
cntl_client = ControllerStub(cntl_channel)
cntl_status = check_controller_status(cntl_host, cntl_port)


def workspace(request):
    return render(request, "tmnt/asset_viewer.html")

def api_not_running_view(request):
    return JsonResponse("Empty View", safe=False)

def add_actor(request):
    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    actor_access = True
    if request.POST.get("actor_access") == "No":
        actor_access = False
    print(actor_name)
    print(actor_type)
    print(actor_access)

    if cntl_status:
        actor = Actor(
            name=actor_name, actor_type=actor_type, physical_access=actor_access
        )
        response_status = cntl_client.AddActor(actor)

        return JsonResponse(response_status.code, safe=False)
    return JsonResponse(503, safe=False)


def add_boundary(request):
    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    actor_access = True
    if request.POST.get("actor_access") == "No":
        actor_access = False
    actor = Actor(
        name=actor_name, actor_type=actor_type, physical_access=actor_access
    )
    boundary_name = request.POST.get("boundary_name")

    if cntl_status:
        boundary = Boundary(name=boundary_name, boundary_owner=actor)
        response_status = cntl_client.AddBoundary(boundary)
        return JsonResponse(response_status.code, safe=False)
    return JsonResponse(503, safe=False)


def add_datastore(request):
    name = request.POST.get("name")
    open_ports_str = request.POST.get("open_ports").split(",")
    open_ports = []
    for port in open_ports_str:
        open_ports.append(int(port))

    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    actor_access = True
    if request.POST.get("actor_access") == "No":
        actor_access = False
    actor = Actor(
        name=actor_name, actor_type=actor_type, physical_access=actor_access
    )
    boundary_name = request.POST.get("boundary_name")
    boundary = Boundary(name=boundary_name, boundary_owner=actor)
    machine_type = request.POST.get("machine_type")
    machine = Machine.PHYSICAL
    if machine_type == "Virtual":
        machine = Machine.VIRTUAL
    elif machine_type == "Container":
        machine = Machine.CONTAINER
    elif machine_type == "Serverless":
        machine = Machine.SERVERLESS
    datastore_type = request.POST.get("ds_type")

    trust_boundaries = [boundary]

    if cntl_status:
        datastore_request = AddDatastoreRequest(
            name=boundary_name,
            open_port=open_ports,
            trust_boundary=trust_boundaries,
            machine=machine,
            ds_type=datastore_type,
        )
        response_status = cntl_client.AddDatastore(datastore_request)
        return JsonResponse(response_status.code, safe=False)
    return JsonResponse(503, safe=False)


def add_externalasset(request):
    name = request.POST.get("name")
    open_ports_str = request.POST.get("open_ports").split(",")
    open_ports = []
    for port in open_ports_str:
        open_ports.append(int(port))

    actor_name = request.POST.get("actor_name")
    actor_type = request.POST.get("actor_type")
    actor_access = True
    if request.POST.get("actor_access") == "No":
        actor_access = False
    actor = Actor(
        name=actor_name, actor_type=actor_type, physical_access=actor_access
    )
    boundary_name = request.POST.get("boundary_name")
    boundary = Boundary(name=boundary_name, boundary_owner=actor)
    machine_type = request.POST.get("machine_type")
    machine = Machine.PHYSICAL
    if machine_type == "Virtual":
        machine = Machine.VIRTUAL
    elif machine_type == "Container":
        machine = Machine.CONTAINER
    elif machine_type == "Serverless":
        machine = Machine.SERVERLESS

    physical_access = True
    if request.POST.get("physical_access") == "No":
        physical_access = False

    trust_boundaries = [boundary]

    if cntl_status:
        addexternalasset_request = AddExternalAssetRequest(
            name=name,
            open_port=open_ports,
            trust_boundary=trust_boundaries,
            machine=machine,
            physical_access=physical_access,
        )
        response_status = cntl_client.AddExternalAsset(
            addexternalasset_request
        )

        return JsonResponse(response_status.code, safe=False)
    return JsonResponse(503, safe=False)
