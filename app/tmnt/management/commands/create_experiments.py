from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from tmnt.models import *

class Command(BaseCommand):
    help = 'Create default experiments for testing purposes'
    def add_arguments(self, parser):
        parser.add_argument('--username', nargs='?', type=str, default='dummy')
        parser.add_argument('--experiment_group', nargs='?', type=str, default=None)

    def handle(self, *args, **options):
        try:
            # create a user, if not exists
            User = get_user_model()
            if not User.objects.filter(username=options['username']).exists():
                dummy_user = User.objects.create(username=options['username'], is_active=False, is_staff=False,
                                                 is_superuser=False)
                dummy_user.save()
            else:
                self.stdout.write(f'User {options["username"]} exists. Skipping creation.')
            dummy_user = User.objects.get(username=options['username'])
            # signals should create ParticipantUser automatically, but check if it exists
            if not ParticipantUser.objects.filter(user=dummy_user).exists():
                participant_user = ParticipantUser.objects.create(user=dummy_user, is_participant=True)
                participant_user.save()
                self.stdout.write(f'User {options['username']} has no associated ParticipantUser. Creating...')
                pu = ParticipantUser.objects.create(user=dummy_user, is_participant=True,
                                                    experiment_group=options['experiment_group'])
                pu.save()

            # create projects for default experiments
            if Project.objects.filter(name='Surgical Robot', user=dummy_user).exists():
                self.stdout.write('Project "Surgical Robot Experiment" exists. Skipping creation.')
            else:
                surgical_robot_project = Project.objects.create(
                    name='Surgical Robot',
                    user=dummy_user,
                    experiment_mode=True,
                    description='Project for surgical robot system.'
                )
                surgical_robot_project.save()
                # add entities, actors, etc. for surgical robot project
                # for each entity, create Entity, subtype (e.g., Actor), and D3NodePosition
                # things: Hospital's Servers (Server), Surgeon Workstation (Actor), Life Support Monitoring Equipment (Process), Surgical robot (Actor), Observer Computer (Process)
                # dataflows between servers and other four entities (all bidirectional)
                server_entity = Entity.objects.create(name="Hospital's Servers", project=surgical_robot_project, type='Server')
                server_entity.save()
                # server type has no subtype class, so skip that
                d3 = D3NodePosition.objects.create(entity=server_entity, x=500, y=260)
                d3.save()
                surgeon_entity = Entity.objects.create(name="Surgeon Workstation", project=surgical_robot_project, type='Actor')
                surgeon_entity.save()
                surgeon_actor = Actor.objects.create(name="Surgeon Workstation", project=surgical_robot_project, parent_entity=surgeon_entity)
                surgeon_actor.save()
                d3 = D3NodePosition.objects.create(entity=surgeon_entity, x=676, y=416)
                d3.save()
                life_support_entity = Entity.objects.create(name="Life Support Monitoring Equipment", project=surgical_robot_project, type='Process')
                life_support_entity.save()
                d3 = D3NodePosition.objects.create(entity=life_support_entity, x=274, y=140)
                d3.save()
                surgical_robot_entity = Entity.objects.create(name="Surgical Robot", project=surgical_robot_project, type='Actor')
                surgical_robot_entity.save()
                surgical_robot_actor = Actor.objects.create(name="Surgical Robot", project=surgical_robot_project, parent_entity=surgical_robot_entity)
                surgical_robot_actor.save()
                d3 = D3NodePosition.objects.create(entity=surgical_robot_entity, x=294, y=410)
                d3.save()
                observer_entity = Entity.objects.create(name="Observer Computer", project=surgical_robot_project, type='Process')
                observer_entity.save()
                d3 = D3NodePosition.objects.create(entity=observer_entity, x=670, y=130)
                d3.save()  # end of surgical robot entities
                df = DataFlow.objects.create(name="", source=server_entity, dest=surgeon_entity, project=surgical_robot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=server_entity, dest=surgical_robot_entity, project=surgical_robot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=server_entity, dest=life_support_entity, project=surgical_robot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=server_entity, dest=observer_entity, project=surgical_robot_project)
                df.save()  # end of surgical robot dataflows
            if Project.objects.filter(name='Insulin Pump', user=dummy_user).exists():
                self.stdout.write('Project "Insulin Pump Experiment" exists. Skipping creation.')
            else:
                insulin_pump_project = Project.objects.create(
                    name='Insulin Pump',
                    user=dummy_user,
                    experiment_mode=True,
                    description='Project for insulin pump system.'
                )
                insulin_pump_project.save()
                # add entities, actors, etc. for insulin pump project
                cgm = Entity.objects.create(name="Glucose Monitor", project=insulin_pump_project, type='Server')
                cgm.save()
                d3 = D3NodePosition.objects.create(entity=cgm, x=294, y=430)
                d3.save()
                insulin_pump_entity = Entity.objects.create(name="Insulin Pump Device", project=insulin_pump_project, type='Server')
                insulin_pump_entity.save()
                d3 = D3NodePosition.objects.create(entity=insulin_pump_entity, x=288, y=212)
                d3.save()
                smartphone = Entity.objects.create(name="Patient Smartphone", project=insulin_pump_project, type='Server')
                smartphone.save()
                d3 = D3NodePosition.objects.create(entity=smartphone, x=504, y=290)
                d3.save()
                server_entity = Entity.objects.create(name="Manufacturer Server", project=insulin_pump_project, type='Server')
                server_entity.save()
                d3 = D3NodePosition.objects.create(entity=server_entity, x=746, y=343)
                d3.save()
                db = Entity.objects.create(name="Manufacturer Database", project=insulin_pump_project, type='Data Store')
                db.save()
                datastore = Datastore.objects.create(name="Manufacturer Database", project=insulin_pump_project, parent_entity=db)
                datastore.save()
                d3 = D3NodePosition.objects.create(entity=db, x=744, y=148)
                d3.save()
                caregiver_entity = Entity.objects.create(name="Caregiver", project=insulin_pump_project, type='Actor')
                caregiver_entity.save()
                caregiver_actor = Actor.objects.create(name="Caregiver", project=insulin_pump_project, parent_entity=caregiver_entity)
                caregiver_actor.save()
                d3 = D3NodePosition.objects.create(entity=caregiver_entity, x=658, y=490)
                d3.save()
                provider_entity = Entity.objects.create(name="Medical Provider", project=insulin_pump_project, type='Actor')
                provider_entity.save()
                provider_actor = Actor.objects.create(name="Medical Provider", project=insulin_pump_project, parent_entity=provider_entity)
                provider_actor.save()
                d3 = D3NodePosition.objects.create(entity=provider_entity, x=875, y=492)
                d3.save()  # end of insulin pump entities
                df = DataFlow.objects.create(name="", source=cgm, dest=smartphone, project=insulin_pump_project)
                df.save()
                df = DataFlow.objects.create(name="", source=insulin_pump_entity, dest=smartphone, project=insulin_pump_project)
                df.save()
                df = DataFlow.objects.create(name="", source=smartphone, dest=server_entity, project=insulin_pump_project)
                df.save()
                df = DataFlow.objects.create(name="", source=server_entity, dest=db, project=insulin_pump_project)
                df.save()
                df = DataFlow.objects.create(name="", source=server_entity, dest=caregiver_entity, project=insulin_pump_project)
                df.save()
                df = DataFlow.objects.create(name="", source=server_entity, dest=provider_entity, project=insulin_pump_project)
                df.save()  # end of insulin pump dataflows
            if Project.objects.filter(name='AI Chatbot', user=dummy_user).exists():
                self.stdout.write('Project "AI Chatbot Experiment" exists. Skipping creation.')
            else:
                ai_chatbot_project = Project.objects.create(
                    name='AI Chatbot',
                    user=dummy_user,
                    experiment_mode=True,
                    description='Project for AI chatbot system.'
                )
                ai_chatbot_project.save()
                # Knowledgebase (Data store), Chat Logs (Data store), Chatbot User (Actor), Web App Frontend (Server), API Gateway (Process), LLM Agent (Server)
                kb = Entity.objects.create(name="Knowledgebase", project=ai_chatbot_project, type='Data Store')
                kb.save()
                ds = Datastore.objects.create(name="Knowledgebase", project=ai_chatbot_project, parent_entity=kb)
                ds.save()
                d3 = D3NodePosition.objects.create(entity=kb, x=243, y=540)
                d3.save()
                chatlogs = Entity.objects.create(name="Chat Logs", project=ai_chatbot_project, type='Data Store')
                chatlogs.save()
                ds = Datastore.objects.create(name="Chat Logs", project=ai_chatbot_project, parent_entity=chatlogs)
                ds.save()
                d3 = D3NodePosition.objects.create(entity=chatlogs, x=246, y=191)
                d3.save()
                user_entity = Entity.objects.create(name="Chatbot User", project=ai_chatbot_project, type='Actor')
                user_entity.save()
                user_actor = Actor.objects.create(name="Chatbot User", project=ai_chatbot_project, parent_entity=user_entity)
                user_actor.save()
                d3 = D3NodePosition.objects.create(entity=user_entity, x=840, y=385)
                d3.save()
                frontend_entity = Entity.objects.create(name="Web App Frontend", project=ai_chatbot_project, type='Server')
                frontend_entity.save()
                d3 = D3NodePosition.objects.create(entity=frontend_entity, x=668, y=160)
                d3.save()
                api_gateway_entity = Entity.objects.create(name="API Gateway", project=ai_chatbot_project, type='Process')
                api_gateway_entity.save()
                d3 = D3NodePosition.objects.create(entity=api_gateway_entity, x=509, y=160)
                d3.save()
                llm_entity = Entity.objects.create(name="LLM Agent", project=ai_chatbot_project, type='Server')
                llm_entity.save()
                d3 = D3NodePosition.objects.create(entity=llm_entity, x=246, y=360)
                d3.save()  # end of AI chatbot entities
                df = DataFlow.objects.create(name="", source=frontend_entity, dest=user_entity, project=ai_chatbot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=api_gateway_entity, dest=frontend_entity, project=ai_chatbot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=llm_entity, dest=api_gateway_entity, project=ai_chatbot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=kb, dest=llm_entity, project=ai_chatbot_project)
                df.save()
                df = DataFlow.objects.create(name="", source=chatlogs, dest=llm_entity, project=ai_chatbot_project)
                df.save()
                # end of AI chatbot dataflows
            if Project.objects.filter(name='DNA Sequencer', user=dummy_user).exists():
                self.stdout.write('Project "DNA Sequencer Experiment" exists. Skipping creation.')
            else:
                dna_sequencer_project = Project.objects.create(
                    name='DNA Sequencer',
                    user=dummy_user,
                    experiment_mode=True,
                    description='Project for DNA sequencer system.'
                )
                dna_sequencer_project.save()
                # add entities, actors, etc. for DNA sequencer project
                patient_entity = Entity.objects.create(name="Patient", project=dna_sequencer_project, type='Actor')
                patient_entity.save()
                patient_actor = Actor.objects.create(name="Patient", project=dna_sequencer_project, parent_entity=patient_entity)
                patient_actor.save()
                d3 = D3NodePosition.objects.create(entity=patient_entity, x=330, y=234)
                d3.save()
                sequencer_entity = Entity.objects.create(name="DNA Sequencer Device", project=dna_sequencer_project, type='Process')
                sequencer_entity.save()
                d3 = D3NodePosition.objects.create(entity=sequencer_entity, x=521, y=135)
                d3.save()
                mi = Entity.objects.create(name="Manufacturer Server", project=dna_sequencer_project, type='Server')
                mi.save()
                d3 = D3NodePosition.objects.create(entity=mi, x=780, y=250)
                d3.save()
                db_entity = Entity.objects.create(name="Manufacturer Database", project=dna_sequencer_project, type='Data Store')
                db_entity.save()
                ds = Datastore.objects.create(name="Manufacturer Database", project=dna_sequencer_project, parent_entity=db_entity)
                ds.save()
                d3 = D3NodePosition.objects.create(entity=db_entity, x=780, y=85)
                d3.save()
                provider_entity = Entity.objects.create(name="Medical Provider", project=dna_sequencer_project, type='Actor')
                provider_entity.save()
                provider_actor = Actor.objects.create(name="Medical Provider", project=dna_sequencer_project, parent_entity=provider_entity)
                provider_actor.save()
                d3 = D3NodePosition.objects.create(entity=provider_entity, x=671,y=460)
                d3.save()  # end of DNA sequencer entities
                researcher_entity = Entity.objects.create(name="Researcher", project=dna_sequencer_project, type='Actor')
                researcher_entity.save()
                researcher_actor = Actor.objects.create(name="Researcher", project=dna_sequencer_project, parent_entity=researcher_entity)
                researcher_actor.save()
                d3 = D3NodePosition.objects.create(entity=researcher_entity, x=920, y=458)
                d3.save()
                # add DataFlows
                df = DataFlow.objects.create(name="(DNA Sample)", source=patient_entity, dest=sequencer_entity, project=dna_sequencer_project)
                df.save()
                df = DataFlow.objects.create(name="", source=sequencer_entity, dest=mi, project=dna_sequencer_project)
                df.save()
                df = DataFlow.objects.create(name="", source=mi, dest=db_entity, project=dna_sequencer_project)
                df.save()
                df = DataFlow.objects.create(name="", source=mi, dest=provider_entity, project=dna_sequencer_project)
                df.save()
                df = DataFlow.objects.create(name="", source=mi, dest=researcher_entity, project=dna_sequencer_project)
                df.save()
            self.stdout.write(self.style.SUCCESS('Successfully created default experiments'))
        except Exception as e:
            raise CommandError(f'Error creating default experiments: {e}')