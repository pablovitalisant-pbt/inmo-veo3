# src/app/api.py
from fastapi import FastAPI

app = FastAPI(title="inmo-veo3")

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/")
def root():
    # opcional: para que la raíz no dé 503 en chequeos manuales
    return {"service": "inmo-veo3", "ok": True}
