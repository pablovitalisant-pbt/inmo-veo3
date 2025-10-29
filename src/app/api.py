# src/app/api.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
from pathlib import Path
from datetime import datetime
import json, os

app = FastAPI(title="inmo-veo3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET","POST","HEAD","OPTIONS"],
    allow_headers=["*"],
)

def _ok(): return {"status":"ok"}

# --- Health ---
@app.get("/healthz", include_in_schema=True)
@app.head("/healthz")
def healthz(): return _ok()

@app.get("/health", include_in_schema=True)
@app.head("/health")
def health(): return _ok()

@app.get("/_ah/health", include_in_schema=False)
@app.head("/_ah/health")
def appengine_health(): return JSONResponse(status_code=200, content={})

@app.get("/", include_in_schema=True)
def root(): return {"service":"inmo-veo3","ok":True}

# --- Helpers simples para Dry Run ---
ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR","artifacts"))
ASSETS_DIR    = Path(os.getenv("ASSETS_DIR","assets"))
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
(ASSETS_DIR / "imagenes_propiedad").mkdir(parents=True, exist_ok=True)
(ASSETS_DIR / "imagenes_agente").mkdir(parents=True, exist_ok=True)
(ASSETS_DIR / "guiones").mkdir(parents=True, exist_ok=True)

def _safe_slug(s: str) -> str:
    import re
    if not re.fullmatch(r"[a-z0-9-]{3,64}", s):
        raise HTTPException(status_code=422, detail="slug inválido: usar a-z, 0-9 y guiones (3-64 chars)")
    return s

def _count_scenes_from_script(text: str) -> int:
    # heurística mínima: cuenta líneas que comienzan con "Escena" o "S#:"
    lines = [l.strip().lower() for l in text.splitlines()]
    return sum(1 for l in lines if l.startswith("escena") or l.startswith("s"))

# --- Dry Run endpoint (no_submit=true) ---
@app.post("/run", status_code=202)
async def run_dry(
    plataforma: str = Form(...),                 # "9:16" | "16:9" | "1:1"
    estilo: str = Form(...),                     # "CINEMATOGRAFICO" | ...
    objetivo: str = Form(...),                   # "captar_leads" | ...
    slug: str = Form(...),                       # ej: demo-parque-a1
    no_submit: Optional[bool] = Form(False),
    propiedad_images: Optional[List[UploadFile]] = File(None, alias="propiedad_images[]"),
    agente_images: Optional[List[UploadFile]]    = File(None, alias="agente_images[]"),
    guion: Optional[UploadFile]                  = File(None),
):
    _safe_slug(slug)
    # Guardar assets mínimos para que aparezcan en artifacts
    updir_prop = ASSETS_DIR / "imagenes_propiedad" / slug
    updir_ag   = ASSETS_DIR / "imagenes_agente" / slug
    updir_prop.mkdir(parents=True, exist_ok=True)
    updir_ag.mkdir(parents=True, exist_ok=True)

    saved_prop, saved_ag = [], []
    if propiedad_images:
        for f in propiedad_images:
            p = updir_prop / f.filename
            p.write_bytes(await f.read())
            saved_prop.append(str(p))
    if agente_images:
        for f in agente_images:
            p = updir_ag / f.filename
            p.write_bytes(await f.read())
            saved_ag.append(str(p))

    # Leer guion si viene
    guion_text = ""
    if guion:
        gpath = ASSETS_DIR / "guiones" / (slug + "-" + guion.filename)
        gpath.write_bytes(await guion.read())
        try:
            guion_text = gpath.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            guion_text = ""
    num_escenas = _count_scenes_from_script(guion_text) if guion_text else max(2, len(saved_prop))

    # Manifest mínimo del Dry Run
    ts = datetime.utcnow().isoformat() + "Z"
    outdir = ARTIFACTS_DIR / slug
    outdir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "slug": slug,
        "timestamp": ts,
        "aspect_ratio": plataforma,
        "style": estilo,
        "objetivo_negocio": objetivo,
        "dry_run": True if no_submit else False,
        "num_escenas": num_escenas,
        "inputs": {
            "propiedad_images": saved_prop,
            "agente_images": saved_ag,
            "guion_present": bool(guion_text),
        },
        "prompts": [],   # aquí irían los prompts por escena (pipeline real)
        "payloads": [],  # aquí irían los payloads Veo3 por escena
        "jobs": {}
    }
    manifest_path = outdir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    # CSV simple
    (outdir / "results.csv").write_text("scene_id,job_id,status,download_url\n")

    return {
        "slug": slug,
        "num_escenas": num_escenas,
        "manifest_path": str(manifest_path),
        "results_csv_path": str(outdir / "results.csv")
    }

# --- Listar artifacts por slug (ayuda para verificar) ---
@app.get("/artifacts/{slug}")
def list_artifacts(slug: str):
    _safe_slug(slug)
    d = ARTIFACTS_DIR / slug
    if not d.exists():
        raise HTTPException(status_code=404, detail="slug no encontrado")
    return {"slug": slug, "files": sorted(str(p) for p in d.rglob("*") if p.is_file())}
