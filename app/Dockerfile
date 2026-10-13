FROM python:3.11

ARG DB_HOST
ARG DB_PASSWORD
ARG DJANGO_SECRET_KEY
ENV DB_HOST=${DB_HOST}
ENV DB_PASSWORD=${DB_PASSWORD}
ENV DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}

RUN mkdir /service
#COPY protobufs/ /service/protobufs/
COPY . /service/app/
WORKDIR /service/app
RUN python -m pip install --upgrade pip
RUN python -m pip install -r requirements.txt
#RUN python -m grpc_tools.protoc -I /service/protobufs --python_out=. \
#    --grpc_python_out=. /service/protobufs/controller.proto

EXPOSE 8086

#RUN python manage.py makemigrations && python manage.py migrate

# TO RUN MIGRATION:
# 1) comment out entrypoint and cmd below
# 2) commit to build a new container
# 3) pull container to server
# 4) run the container with "bash" at end, make your migrations in the bash terminal, then exit the container and uncomment the entrypoint and cmd below for normal operation
#ENTRYPOINT ["python", "manage.py"]
#CMD ["runserver", "0.0.0.0:8086"]
# only for gunicorn below!
#CMD ["gunicorn", "--bind", "0.0.0.0:8086", "tmnt.wsgi:application"]
