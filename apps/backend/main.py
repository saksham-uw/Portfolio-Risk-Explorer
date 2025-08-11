from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import db_ping

app = FastAPI(title="Portfolio Risk Explorer API", version="0.1.0")

# CORS for local frontend later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    ok = db_ping()
    return {"status": "ok" if ok else "db_error"}
