FROM python:3.14-slim

WORKDIR /app

# La imagen base trae paquetes del sistema que pueden tener CVEs con correccion ya publicada
# (ej. zlib1g). Se actualizan al construir y se limpia la lista de paquetes para no inflar la imagen.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# pip y setuptools vienen empaquetados en la imagen base y pueden traer CVEs
# conocidos incluso sin que el proyecto los use directamente en runtime.
RUN pip install --no-cache-dir --upgrade pip setuptools

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Sin privilegios de root, y sin escribir .pyc en un directorio que ese usuario no puede modificar.
ENV PYTHONDONTWRITEBYTECODE=1
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app
USER app

EXPOSE 8000

# Forma shell (no exec): permite que ${PORT} se expanda en tiempo de
# ejecucion, en vez de quedar hardcodeado y desincronizado de PORT en
# docker-compose.yml.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
