from fastapi import FastAPI

app = FastAPI(title="inmo-veo3")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "inmo-veo3 backend is running 🚀"}
