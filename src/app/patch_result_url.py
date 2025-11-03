import io, re, sys
p = "main.py"
s = open(p, "r", encoding="utf-8").read()

# Garantiza imports
if "from datetime import timedelta" not in s:
    s = s.replace("from fastapi import", "from datetime import timedelta\nfrom fastapi import")

if "from fastapi.responses import JSONResponse" not in s:
    s = s.replace("from fastapi import FastAPI", "from fastapi import FastAPI\nfrom fastapi.responses import JSONResponse")

# Bloque completo del endpoint con firma V4
block = r'''
@app.get("/artifacts/{slug}/result_url")
def get_result_signed_url(slug: str, minutes: int = 60):
    """
    Devuelve una URL firmada (V4) para reproducir result.mp4 en la UI.
    Requiere que la cuenta de servicio del servicio Cloud Run tenga:
      - roles/storage.objectViewer en el bucket
      - roles/iam.serviceAccountTokenCreator sobre sí misma (self-binding)
    """
    path = f"{slug}/result.mp4"
    blob = get_bucket().blob(path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail="result.mp4 not found")

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="GET",
    )
    return JSONResponse(content={"url": url})
'''

# Inserta o reemplaza el endpoint
if re.search(r'@app\.get\("/artifacts/\{slug\}/result_url"\)', s):
    s = re.sub(r'@app\.get\("/artifacts/\{slug\}/result_url"\)[\s\S]*?return\s+JSONResponse\(content=\{\"url\":\s*url\}\)\s*\n', block+"\n", s, count=1)
else:
    # Lo añadimos al final del archivo
    s = s.rstrip() + "\n\n" + block + "\n"

open(p, "w", encoding="utf-8").write(s)
print("✅ result_url (V4) aplicado en", p)
