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

from fastapi import UploadFile, File, HTTPException
from db import SessionLocal, engine
from services.crypto import encrypt_bytes, ensure_dir
from services.pdf_parser import extract_text_by_page, chunk_clauses
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()
STORAGE_DIR = os.getenv("STORAGE_DIR", "storage")

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    pdf_bytes = await file.read()

    # Encrypt & save
    ensure_dir(STORAGE_DIR)
    save_path = os.path.join(STORAGE_DIR, file.filename + ".enc")
    with open(save_path, "wb") as f:
        f.write(encrypt_bytes(pdf_bytes))

    # Insert document
    with SessionLocal() as db:
        result = db.execute(
            text("INSERT INTO ta.documents (filename) VALUES (:fn) RETURNING id"),
            {"fn": file.filename},
        )
        doc_id = result.scalar_one()

        # Parse & chunk
        pages = extract_text_by_page(pdf_bytes)
        clauses = chunk_clauses(pages)

        for c in clauses:
            db.execute(
                text("""
                    INSERT INTO ta.clauses (document_id, page_number, text)
                    VALUES (:doc, :pg, :txt)
                """),
                {"doc": doc_id, "pg": c["page_number"], "txt": c["text"]},
            )
        db.commit()

    return {"document_id": doc_id, "clauses_inserted": len(clauses)}
