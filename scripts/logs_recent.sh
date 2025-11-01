#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-gen-lang-client-0047902430}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-inmo-veo3}"
FRESHNESS="${FRESHNESS:-10m}"   # ventana de tiempo
LIMIT="${LIMIT:-50}"

echo "==> Logs de $SERVICE (últimos $FRESHNESS) en $PROJECT/$REGION"

echo -e "\n[1/3] ❗️Errores recientes (ERROR/CRITICAL):"
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE\" AND (severity>=ERROR)" \
  --project="$PROJECT" \
  --freshness="$FRESHNESS" \
  --limit="$LIMIT" \
  --format="table(timestamp,severity,textPayload)" || true

echo -e "\n[2/3] 📄 Llamadas a /run:"
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE\" AND httpRequest.requestUrl=~\"/run\"" \
  --project="$PROJECT" \
  --freshness="$FRESHNESS" \
  --limit="$LIMIT" \
  --format="table(timestamp,httpRequest.status,httpRequest.requestMethod,httpRequest.requestUrl)" || true

echo -e "\n[3/3] ℹ️ Mensajes de arranque (gunicorn/uvicorn):"
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE\" AND (textPayload:gunicorn OR textPayload:uvicorn OR textPayload:\"Starting gunicorn\")" \
  --project="$PROJECT" \
  --freshness="$FRESHNESS" \
  --limit="$LIMIT" \
  --format="table(timestamp,textPayload)" || true
