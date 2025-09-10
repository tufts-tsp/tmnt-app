from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    name = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="my_projects")
    experiment_mode = models.BooleanField(default=False)  # True if this is used for a research study
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    class Meta:
        constraints = [models.UniqueConstraint(fields=['name', 'user'], name='unique_name_per_user')]

class Entity(models.Model):
    # Actor, Server, Process, Lambda, TrustBoundary, DataStore, ExtAsset all inherit this class
    name = models.CharField(max_length=100, null=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    comments = models.TextField(blank=True)
    type = models.CharField(max_length=15, null=False)

    def __str__(self):
        return self.name
    class Meta:
        constraints = [models.UniqueConstraint(fields=['name', 'project'], name='entity_name_unique_to_project')]

class Actor(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    parent_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='parent_actor')
    priv_level = models.CharField(max_length=100)  # may want predefined values

    def __str__(self):
        return self.name
    class Meta:
        constraints = [models.UniqueConstraint(fields=['name', 'project'], name='actor_name_unique_to_project')]

class TrustBoundary(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    entities = models.ManyToManyField(Entity)
    actor_type = models.CharField(max_length=100)
    actor_name = models.CharField(max_length=100)  # maybe should be ref to Actor class
    comments = models.TextField(blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['name', 'project'], name='tb_name_unique_to_project')]

class Datastore(models.Model):
    name = models.CharField(max_length=100, null=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    parent_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='parent_datastore')
    actor = models.ManyToManyField(Actor)
    trust_boundaries = models.ManyToManyField(TrustBoundary)
    data_type = models.CharField(max_length=100)
    machine_type = models.CharField(max_length=100)
    ports = models.CharField(max_length=400)  # expecting comma-separated list of integers

class ExtAsset(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    parent_entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='parent_extasset')
    ports = models.CharField(max_length=400)  # expecting comma-separated list of integers
    machine_type = models.CharField(max_length=100)
    type = models.CharField(max_length=15, null=False, default="External Entity")
    class Meta:
        constraints = [models.UniqueConstraint(fields=['name', 'project'], name='extasset_name_unique_to_project')]

class DataFlow(models.Model):
    source = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='source_entity')
    dest = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='dest_entity')
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    protocol = models.CharField(max_length=100)
    comments = models.TextField(blank=True)

class Threat(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    assets = models.ManyToManyField(Entity)
    cve_id = models.CharField(max_length=100)
    stride_class = models.CharField(max_length=50)  # has six values...maybe revisit type
    severity = models.CharField(max_length=100)  # maybe revisit type
    description = models.TextField(blank=True)

class Assumption(models.Model):
    # name = models.CharField(max_length=100, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    comments = models.TextField(blank=True)
    assets = models.ManyToManyField(Entity)
    threats = models.ManyToManyField(Threat)

class Control(models.Model):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    description = models.TextField(blank=True)
    threats = models.ManyToManyField(Threat)
    assets = models.ManyToManyField(Entity)

class MitigatedThreat(models.Model):
    asset = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='asset')
    threat = models.ForeignKey(Threat, on_delete=models.CASCADE, related_name='threat')
    control = models.ForeignKey(Control, on_delete=models.CASCADE, related_name='control')
    project= models.ForeignKey(Project, on_delete=models.CASCADE)

class Workflow(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, unique=True)

class D3NodePosition(models.Model):
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='d3_node_positions')
    x = models.FloatField()
    y = models.FloatField()

    def __str__(self):
        return f"Node {self.entity}: ({self.x}, {self.y})"

class UserAction(models.Model):
    """
    username: username of participant
    type: type of action (delete {asset, threat, assumption}, create {asset, threat, assumption}, modify {asset, threat,
    assumption})
    details: string providing details of threat or assumption
    """
    username = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    action = models.CharField(max_length=100, null=False, default="Unknown")
    entities = models.TextField(blank=True)
    details = models.TextField(blank=True)
    time = models.DateTimeField(auto_now_add=True)

