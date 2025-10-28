# ---- Runtime base ----
FROM python:3.11-slim

# Sistema
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=8080
WORKDIR /app

# Dependencias del sistema para Pillow/colorthief
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libjpeg62-turbo-dev zlib1g-dev curl \
 && rm -rf /var/lib/apt/lists/*

# Copia manifests de dependencias (usa el que exista)
COPY requirements.txt /app/requirements.txt
# Si tu proyecto usa pyproject.toml, súbelo también y descomenta estas 2 líneas:
# COPY pyproject.toml /app/pyproject.toml
# RUN pip install --no-cache-dir .

# Instala deps
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copia el código
COPY src /app/src
COPY assets /app/assets
COPY README.md /app/README.md

# Healthcheck simple
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:$PORT/healthz || exit 1

# Arranque FastAPI con gunicorn+uvicorn worker
CMD ["gunicorn","-k","uvicorn.workers.UvicornWorker","-w","2","-b","0.0.0.0:8080","src.app.main:app"]
