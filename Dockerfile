# ---- Base de runtime (simple y confiable) ----
FROM python:3.11-slim

# Evita pyc y buffers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Dependencias del sistema (Pillow y amigos suelen requerirlas)
# Si en tu build no las necesitas, puedes comentar este bloque.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo-dev zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

# Variables de entorno usadas por la app en Cloud Run
ENV ARTIFACTS_DIR=/tmp/artifacts \
    ASSETS_DIR=/tmp/assets \
    PORT=8080

# Copia SOLO requirements primero para cachear capas correctamente
COPY requirements.txt /app/requirements.txt

# Instala dependencias en el MISMO intérprete que se usará en runtime
RUN python -m pip install --no-cache-dir -r /app/requirements.txt

# Verificación explícita: falla el build si falta python-multipart
RUN python -c "import multipart; print('multipart-ok')"

# Copia el código de la app
COPY src /app/src
# (No copiamos /assets para evitar fallos cuando el dir no existe;
#  si lo necesitas, súbelo al repo y agrega: COPY assets /app/assets)

# Crea directorios de trabajo en /tmp (es el único FS escribible en Cloud Run)
RUN mkdir -p /tmp/artifacts /tmp/assets

# Expone el puerto que usará Cloud Run internamente
EXPOSE 8080

# Arranque: Gunicorn con el worker ASGI de Uvicorn apuntando a FastAPI
CMD exec gunicorn -w 1 -k uvicorn.workers.UvicornWorker src.app.api:app --bind 0.0.0.0:${PORT}

# Copia el script de arranque
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expone el puerto
EXPOSE 8080

# Usa el script de arranque blindado
CMD ["/app/start.sh"]
