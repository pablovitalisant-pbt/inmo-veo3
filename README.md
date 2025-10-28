# Inmo-Veo3: Generador de Vídeos Inmobiliarios (Full-Stack)

Este proyecto utiliza la API de Google Veo para generar clips de vídeo promocionales a partir de imágenes de propiedades, fotos de agentes y un guion por escenas. La arquitectura consta de un frontend en React y un backend en Python (FastAPI) que orquesta la generación de vídeos.

## Arquitectura

-   **Frontend**: Una Single Page Application (SPA) construida con React y TypeScript para la interfaz de usuario.
-   **Backend**: Un microservicio en Python construido con FastAPI para gestionar la lógica de negocio, la comunicación con la API de Veo y servir los resultados.
-   **Contenerización**: Docker se utiliza para empaquetar y ejecutar el backend de forma aislada y reproducible.
-   **CI/CD**: GitHub Actions automatiza las comprobaciones de calidad del código y la construcción de la imagen Docker.

## Cómo ejecutar localmente con Docker

Esta es la forma recomendada para un entorno de desarrollo.

### 1. Prerrequisitos
-   [Docker](https://www.docker.com/get-started) y Docker Compose.
-   Git.

### 2. Instalación
Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/inmo-veo3.git
cd inmo-veo3
```

### 3. Configuración de Entorno
Copia el archivo de ejemplo `.env.example` a `.env` y completa las variables con tus credenciales de la API de Google AI.
```bash
cp .env.example .env
```
Edita el archivo `.env`:
```env
# .env
VEO_API_KEY="tu_api_key_aqui"
```

### 4. Ejecutar la aplicación
Levanta el servicio del backend con Docker Compose:
```bash
docker-compose up --build
```
El backend estará disponible en `http://localhost:8080`.

Para ejecutar el frontend, abre una nueva terminal en la raíz del proyecto. No necesita instalación, puedes servirlo con cualquier servidor estático o usar un entorno de desarrollo como Vite.

### 5. Acceder a la aplicación
Abre `index.html` en tu navegador. La aplicación frontend se conectará automáticamente al backend que se ejecuta en Docker.

## Desarrollo del Backend (sin Docker)

Si prefieres ejecutar el backend directamente en tu máquina.

### 1. Prerrequisitos
-   Python 3.11+
-   [Poetry](https://python-poetry.org/docs/#installation)

### 2. Instalación de dependencias
```bash
poetry install
```

### 3. Ejecutar el servidor de desarrollo
Asegúrate de tener tu archivo `.env` configurado.
```bash
poetry run uvicorn src.app.main:app --reload --port 8080
```

## Herramientas de Calidad (Backend)
Puedes ejecutar las herramientas de calidad del código manualmente:
```bash
# Formatear código
poetry run ruff format .
# Comprobar linting
poetry run ruff check .
# Comprobar tipado estático
poetry run mypy src/
```

## Pruebas (Backend)
El proyecto incluye una suite de pruebas para el backend que valida el comportamiento de la API y la lógica del orquestador. Para ejecutarlas:
```bash
poetry run pytest
```

## Prueba manual E2E (checklist rápido)

### Sanidad del servicio
- [ ] Abre el endpoint de salud en el navegador (`http://localhost:8080/healthz`) y confirma que responde `{"status":"ok"}`.
- [ ] Abre el endpoint de métricas (`http://localhost:8080/metrics`) y comprueba que carga sin errores.

### Dry-run (sin enviar a Veo)
- [ ] Desde un cliente REST, ejecuta `POST /run` con `no_submit` activado, adjuntando:
    - 2–3 fotos de propiedad, 1 del agente.
    - 1 guion simple con 2–3 escenas.
    - parámetros: `plataforma` (e.g., `9:16`), `estilo` (`CINEMATOGRAFICO`), `objetivo` (`captar_leads`), `slug` (corto y en minúsculas).
- [ ] Espera respuesta `202 Accepted` con: número de escenas, rutas a `manifest` y `results.csv`.
- [ ] Verifica que en `artifacts/<slug>/` existan `manifest.json`, `results.csv`, prompts y payloads por escena.

### Ejecución real (submit a Veo)
- [ ] Repite la llamada anterior sin `no_submit`.
- [ ] Consulta `GET /jobs/{slug}` y observa el avance: `queued` → `processing` → `succeeded`/`failed`.
- [ ] Al finalizar, revisa en `artifacts/<slug>/` que `results.csv` tenga una fila por escena y que el manifest incluya `download_url` si corresponde.

### Concurrencia controlada
- [ ] Usa un guion con más escenas que `MAX_SCENE_CONCURRENCY` (si es 3, crea 5–6 escenas).
- [ ] Observa en `/metrics` que la profundidad de cola (`inmov3_queue_depth`) no pase el límite.

### Idempotencia
- [ ] Ejecuta otra vez la misma solicitud con idénticos prompts/imágenes.
- [ ] Confirma que el sistema salta escenas ya procesadas (mismo `idempotency_key`) o reaprovecha jobs previos.

### Límites y validaciones
- [ ] Intenta subir una imagen de más de 25 MB → debe responder `413 Payload Too Large`.
- [ ] Usa un slug inválido (con mayúsculas o símbolos) → debe responder `422 Unprocessable Entity`.

### Errores y Reintentos
- [ ] (Opcional) Cambia la API key a una inválida y ejecuta → debes ver un error estandarizado en la respuesta y un incremento en `inmov3_api_errors_total`.
- [ ] (Opcional) Restaura la key, activa `ORCH_RETRY_ON_FAIL=true` y confirma que reintenta una vez ante fallos transitorios.

### Timeouts
- [ ] (Opcional) Reduce `SCENE_TIMEOUT_S` para forzar un timeout y confirmar que el estado queda como `timeout` en el `manifest.json`.

## Opciones de despliegue

### A. Despliegue rápido en Cloud Run (recomendado)
El contenedor ya está listo. Crea un servicio en Cloud Run, configura las variables de entorno (usando Secret Manager para la API key) y habilita Cloud Logging/Monitoring.
**Beneficio**: autoescalado y HTTPS gestionado.

### B. Despliegue en VM o Kubernetes
Útil si necesitas GPUs, colas externas (Pub/Sub) o un rate-limiter compartido. Añade un Ingress con TLS, Prometheus/Grafana para métricas y políticas de retención de artefactos.

### C. Añadir una UI mínima para agentes
Una interfaz web sencilla (drag-and-drop de fotos, textarea para guion, selector de estilo/plataforma) que consuma tu FastAPI. Después, se puede añadir autenticación básica (e.g., Google Identity / Firebase Auth) y un historial de proyectos por agente.

## Lista de “listo para producción”

- [ ] **Seguridad**: Variables y secretos no aparecen en logs (`VEO_API_KEY` redactada).
- [ ] **CORS**: Configurado con dominios explícitos, no `"*"`.
- [ ] **Almacenamiento**: Backups y política de retención para `artifacts/`.
- [ ] **Legal**: Consentimiento de uso de imágenes del agente y de la propiedad.
- [ ] **Límites**: Límites de tasa (`rate limits`) acordes a tu plan de Veo.
