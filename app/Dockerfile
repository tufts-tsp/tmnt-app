FROM python

RUN mkdir /service
COPY protobufs/ /service/protobufs/
COPY app/ /service/app/
WORKDIR /service/app
RUN python -m pip install --upgrade pip
RUN python -m pip install -r requirements.txt
RUN python -m grpc_tools.protoc -I /service/protobufs --python_out=. \
    --grpc_python_out=. /service/protobufs/controller.proto

EXPOSE 8000

RUN python manage.py migrate

ENTRYPOINT ["python", "manage.py"]
CMD ["runserver", "0.0.0.0:8000"]
