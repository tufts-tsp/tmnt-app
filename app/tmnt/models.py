from django.db import models


class Asset(models.Model):
    # Actor, Server, Process, Lambda, TrustBoundary, DataStore, ExtAsset all inherit this class
    name = models.CharField(max_length=100, unique=True, null=False)
    comments = models.TextField(blank=True)

class Actor(Asset):
    priv_level = models.CharField(max_length=100)  # may want predefined values
    type = models.CharField(max_length=15, null=False, default="Actor")

class Server(Asset):
    type = models.CharField(max_length=15, null=False, default="Server")

class Process(Asset):
    type = models.CharField(max_length=15, null=False, default="Process")

class Lambda(Asset):
    type = models.CharField(max_length=15, null=False, default="Lambda")

class TrustBoundary(models.Model):
    name = models.CharField(max_length=100, unique=True)
    assets = models.ManyToManyField(Asset)
    actor_type = models.CharField(max_length=100)
    actor_name = models.CharField(max_length=100)  # maybe should be ref to Actor class
    comments = models.TextField(blank=True)

class Datastore(Asset):
    ports = models.CharField(max_length=400)  # expecting comma-separated list of integers
    actor = models.ManyToManyField(Actor)
    trust_boundaries = models.ManyToManyField(TrustBoundary)
    data_type = models.CharField(max_length=100)
    machine_type = models.CharField(max_length=100)
    type = models.CharField(max_length=15, null=False, default="Datastore")

class ExtAsset(Asset):
    ports = models.CharField(max_length=400)  # expecting comma-separated list of integers
    machine_type = models.CharField(max_length=100)
    type = models.CharField(max_length=15, null=False, default="External Entity")

class DataFlow(models.Model):
    source = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='source_asset')
    dest = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='dest_asset')
    name = models.CharField(max_length=100)
    protocol = models.CharField(max_length=100)
    comments = models.TextField(blank=True)

class Threat(models.Model):
    name = models.CharField(max_length=100)
    assets = models.ManyToManyField(Asset)
    stride_class = models.CharField(max_length=50)  # has six values...maybe revisit type
    severity = models.CharField(max_length=100)  # maybe revisit type
    comments = models.TextField(blank=True)

class Assumption(models.Model):
    name = models.CharField(max_length=100)
    comments = models.TextField(blank=True)
    assets = models.ManyToManyField(Asset)
    threats = models.ManyToManyField(Threat)

class Workflow(models.Model):
    pass

