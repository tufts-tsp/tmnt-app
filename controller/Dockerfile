FROM python

RUN mkdir /service
COPY protobufs/ /service/protobufs/
COPY controller/ /service/controller/
COPY tmnpy-0.0.0-py3-none-any.whl /service/controller/tmnpy-0.0.0-py3-none-any.whl
WORKDIR /service/controller
RUN python -m pip install --upgrade pip
RUN python -m pip install -r requirements.txt
RUN python -m pip install tmnpy-0.0.0-py3-none-any.whl
RUN python -m grpc_tools.protoc -I /service/protobufs --python_out=. \
    --grpc_python_out=. /service/protobufs/controller.proto

EXPOSE 50051
ENTRYPOINT [ "python", "controller.py" ]
