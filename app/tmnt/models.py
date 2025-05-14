from django.db import models
'''
(All contain name UNIQUE, comments)

Entities:
- server
- process
- lambda
- actor:
    - privilege level
- datastore
    - ports
    - actor name FOREIGN KEY
    - trust boundaries FOREIGN KEY MANY TO MANY
    - actor type
    - machine type
Dataflows
    - source FOREIGN KEY
    - destination FOREIGN KEY
    - protocol

Trust Boundaries
     - actor type
     - actor name
     - assets FOREIGN KEY MANY TO MANY
'''

class Entity(models.Model):
    # Actor, Server, Process, Lambda, TrustBoundary, DataStore, ExtAsset all inherit this class
    name = models.CharField(max_length=100, unique=True, null=False)
    comments = models.TextField(blank=True)
    type = models.CharField(max_length=15, null=False)

    def __str__(self):
        return self.name

class Actor(models.Model):
    name = models.CharField(max_length=100, unique=True)
    parent_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='parent_actor')
    priv_level = models.CharField(max_length=100)  # may want predefined values

    def __str__(self):
        return self.name

class TrustBoundary(models.Model):
    name = models.CharField(max_length=100, unique=True)
    entities = models.ManyToManyField(Entity)
    actor_type = models.CharField(max_length=100)
    actor_name = models.CharField(max_length=100)  # maybe should be ref to Actor class
    comments = models.TextField(blank=True)

class Datastore(Entity):
    # name = models.CharField(max_length=100, null=False)
    parent_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='parent_datastore')
    actor = models.ManyToManyField(Actor)
    trust_boundaries = models.ManyToManyField(TrustBoundary)
    data_type = models.CharField(max_length=100)
    machine_type = models.CharField(max_length=100)
    ports = models.CharField(max_length=400)  # expecting comma-separated list of integers
    # type = models.CharField(max_length=15, null=False, default="Datastore")

class ExtAsset(models.Model):
    parent_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='parent_extasset')
    ports = models.CharField(max_length=400)  # expecting comma-separated list of integers
    machine_type = models.CharField(max_length=100)
    type = models.CharField(max_length=15, null=False, default="External Entity")

class DataFlow(models.Model):
    source = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='source_entity')
    dest = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='dest_entity')
    name = models.CharField(max_length=100)
    protocol = models.CharField(max_length=100)
    comments = models.TextField(blank=True)

class Threat(models.Model):
    name = models.CharField(max_length=100)
    assets = models.ManyToManyField(Entity)
    stride_class = models.CharField(max_length=50)  # has six values...maybe revisit type
    severity = models.CharField(max_length=100)  # maybe revisit type
    comments = models.TextField(blank=True)

class Assumption(models.Model):
    name = models.CharField(max_length=100, unique=True)
    comments = models.TextField(blank=True)
    assets = models.ManyToManyField(Entity)
    threats = models.ManyToManyField(Threat)

class Workflow(models.Model):
    name = models.CharField(max_length=100, unique=True)

class UserAction(models.Model):
    username = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=100, null=False, default="Unknown")
    action = models.CharField(max_length=100)
    stride_class = models.CharField(max_length=100)
    entities = models.TextField(blank=True)
    time = models.DateTimeField(auto_now_add=True)

