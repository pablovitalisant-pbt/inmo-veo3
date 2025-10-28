# src/app/api.py
from fastapi import FastAPI, Response

app = FastAPI(title="inmo-veo3")

def _ok():
    return {"status": "ok"}

# Health endpoints (múltiples aliases por compatibilidad con Google LB/Cloud Run/CDN)
@app.get("/healthz", include_in_schema=True)
@app.head("/healthz")
def healthz():
    return _ok()

@app.get("/health", include_in_schema=True)
@app.head("/health")
def health():
    return _ok()

# Algunos balanceadores antiguos usan esta ruta
@app.get("/_ah/health", include_in_schema=False)
@app.head("/_ah/health")
def appengine_health():
    return Response(status_code=200)

# raíz informativa
@app.get("/", include_in_schema=True)
def root():
    return {"service": "inmo-veo3", "ok": True}
