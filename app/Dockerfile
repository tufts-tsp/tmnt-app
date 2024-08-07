FROM python

RUN mkdir /application
COPY protobufs/ /application/protobufs/
COPY ui/ /application/ui/
WORKDIR /application/ui
RUN python -m pip install --upgrade pip
RUN python -m pip install -r requirements.txt
RUN python -m grpc_tools.protoc -I /application/protobufs --python_out=. \
    --grpc_python_out=. /application/protobufs/controller.proto

EXPOSE 8000

RUN python manage.py migrate

ENTRYPOINT ["python", "manage.py"]
CMD ["runserver", "0.0.0.0:8000"]
