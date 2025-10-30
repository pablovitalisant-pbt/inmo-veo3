from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from prometheus_fastapi_instrumentator import Instrumentator
import os, csv, io, json, datetime, random, string

app = FastAPI(title="InmoVeo3 Backend")

# === Configuración ===
ARTIFACTS_BUCKET = os.getenv("ARTIFACTS_BUCKET", "inmo-veo3-artifacts-859994227667")
storage_client = storage.Client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# === Funciones auxiliares ===
def get_bucket():
    return storage_client.bucket(ARTIFACTS_BUCKET)


def random_slug():
    ts = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{ts}-{rand}"


def write_text(blob_path: str, text: str, content_type: str = "text/plain"):
    bucket = get_bucket()
    blob = bucket.blob(blob_path)
    blob.upload_from_string(text, content_type=content_type)


def read_text(blob_path: str) -> str:
    bucket = get_bucket()
    blob = bucket.blob(blob_path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {blob_path}")
    return blob.download_as_text()


def list_slugs():
    bucket = get_bucket()
    slugs = set()
    for blob in bucket.list_blobs(delimiter="/"):
        prefix = blob.name.split("/")[0]
        if prefix:
            slugs.add(prefix)
    return sorted(slugs)


# === Endpoints ===
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run")
async def run(file: UploadFile = File(None), notes: str = Form(None)):
    slug = random_slug()
    prefix = slug + "/"
    manifest = {
        "slug": slug,
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        "notes": notes,
        "bucket": ARTIFACTS_BUCKET,
    }

    # Subir manifest.json
    write_text(prefix + "manifest.json", json.dumps(manifest), "application/json")

    # CSV ficticio
    csv_buf = io.StringIO()
    writer = csv.writer(csv_buf)
    writer.writerow(["id", "value"])
    writer.writerow(["1", "100"])
    writer.writerow(["2", "200"])
    write_text(prefix + "results.csv", csv_buf.getvalue(), "text/csv")

    # Si hay archivo subido
    if file:
        content = await file.read()
        write_text(prefix + file.filename, content.decode("utf-8", "ignore"), file.content_type)

    return {"slug": slug, "bucket": ARTIFACTS_BUCKET}


@app.get("/artifacts")
def get_artifacts():
    slugs = list_slugs()
    return {"slugs": slugs, "count": len(slugs)}


@app.get("/artifacts/{slug}")
def get_artifact(slug: str):
    prefix = f"{slug}/"
    try:
        manifest_json = read_text(prefix + "manifest.json")
        results_csv = read_text(prefix + "results.csv")
    except HTTPException:
        raise HTTPException(status_code=404, detail=f"Artifact {slug} not found")

    return {
        "slug": slug,
        "manifest": json.loads(manifest_json),
        "results_csv": results_csv,
    }
