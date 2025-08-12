"""
API routes for the Portfolio Risk Explorer application.

This module contains all the API endpoints for handling PDF uploads and document processing.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import text
from db import SessionLocal
from services.crypto import encrypt_bytes, ensure_dir, decrypt_bytes
from services.pdf_parser import extract_text_by_page, chunk_clauses
from services.embeddings import embed_text
import os
import numpy as np
from typing import List, Optional
from fastapi import Query
from sqlalchemy import text as sqltext
from services.compliance_checker import load_rules, evaluate_rules_on_clauses
from datetime import timezone
import json
from fastapi import Header
from fastapi.responses import StreamingResponse
import io, json

router = APIRouter()
STORAGE_DIR = os.getenv("STORAGE_DIR", "storage")
API_KEY = os.getenv("API_KEY")

def _require_api_key(x_api_key: str | None):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

def _parse_vector(v) -> np.ndarray:
    """
    Accepts pgvector returned as Python list/tuple OR as a string like "[0,0.1,...]".
    Returns float32 numpy array of shape (384,).
    """
    if isinstance(v, (list, tuple, np.ndarray)):
        return np.asarray(v, dtype=np.float32)
    if isinstance(v, str):
        s = v.strip()
        if s.startswith("[") and s.endswith("]"):
            s = s[1:-1]
        # fast parse
        return np.fromstring(s, sep=",", dtype=np.float32)
    raise ValueError(f"Unsupported vector type: {type(v)}")

def _audit(event: str, details: dict):
    with SessionLocal() as db:
        db.execute(
            sqltext("""
                INSERT INTO ta.audit_log (event, details)
                VALUES (:e, CAST(:d AS JSONB))
            """),
            {"e": event, "d": json.dumps(details)},
        )
        db.commit()


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Handle PDF file upload, processing, and storage.
    
    Args:
        file: The uploaded PDF file
        
    Returns:
        dict: Document ID and number of clauses processed
        
    Raises:
        HTTPException: If the file is not a PDF
    """
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
            text("""
                INSERT INTO ta.documents (filename) 
                VALUES (:fn) 
                RETURNING id
            """),
            {"fn": file.filename},
        )
        doc_id = result.scalar_one()

        # Parse & chunk
        pages = extract_text_by_page(pdf_bytes)
        clauses = chunk_clauses(pages)

        # Process and store clauses with embeddings
        for clause in clauses:
            vec = embed_text(clause["text"])
            db.execute(
                text("""
                    INSERT INTO ta.clauses (document_id, page_number, text, embedding)
                    VALUES (:doc, :pg, :txt, :emb)
                """),
                {
                    "doc": doc_id,
                    "pg": clause["page_number"],
                    "txt": clause["text"],
                    "emb": vec.tolist(),
                },
            )

        db.commit()
        _audit("upload_pdf", {"document_id": doc_id, "filename": file.filename})

    return {
        "document_id": doc_id,
        "clauses_inserted": len(clauses)
    }

@router.get("/search")
def search(q: str = Query(..., min_length=2), k: int = 5):
    """
    Vector search over clause embeddings using cosine distance.
    Returns top-k closest clauses to the query.
    """
    
    # Helper function to convert numpy array to pgvector literal
    def _to_vector_literal(vec) -> str:
        # pgvector accepts the string form "[v1,v2,...]"
        return "[" + ",".join(f"{x:.6f}" for x in vec.tolist()) + "]"

    _audit("search", {"q": q, "k": k})
    vec = embed_text(q)
    emb_str = _to_vector_literal(vec)

    rows: List[dict] = []
    with SessionLocal() as db:
        res = db.execute(
            sqltext("""
                SELECT
                    id,
                    document_id,
                    page_number,
                    text,
                    (embedding <=> CAST(:emb AS vector)) AS distance
                FROM ta.clauses
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:emb AS vector)
                LIMIT :k
            """),
            {"emb": emb_str, "k": k},
        )
        for r in res:
            rows.append({
                "id": r.id,
                "document_id": r.document_id,
                "page_number": r.page_number,
                "score": max(0.0, 1.0 - float(r.distance)),
                "text": r.text[:500],
            })

    return {"query": q, "results": rows}

@router.get("/compliance")
def compliance_summary():
    """
    Evaluate simple text-based compliance rules across the portfolio.
    Returns coverage % per rule and which documents are compliant/non-compliant.
    """
    _audit("compliance_summary", {})
    rules_path = os.path.join(os.path.dirname(__file__), "rules", "contract_rules.yaml")
    # when running from apps/backend, __file__ is routes.py; adjust to repo layout:
    rules_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "rules", "contract_rules.yaml"))
    if not os.path.exists(rules_path):
        # fall back to ../rules when running via uvicorn main:app
        rules_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "rules", "contract_rules.yaml"))

    rules = load_rules(rules_path)

    with SessionLocal() as db:
        res = db.execute(sqltext("SELECT document_id, text FROM ta.clauses"))
        clauses = [{"document_id": r.document_id, "text": r.text} for r in res]

    results = evaluate_rules_on_clauses(rules, clauses)

    # shape into a stable list for the frontend
    summary = [
        {
            "rule_id": rid,
            "name": data["name"],
            "coverage_pct": data["coverage_pct"],
            "compliant_docs": data["compliant"],
            "non_compliant_docs": data["non_compliant"],
        }
        for rid, data in results.items()
    ]
    summary.sort(key=lambda x: x["rule_id"])
    total_docs = len({c["document_id"] for c in clauses})
    return {"total_documents": total_docs, "rules": summary}

@router.get("/anomalies")
def anomalies(k: int = 10):
    """
    Unsupervised semantic anomalies:
    - Pull all clause embeddings
    - Compute portfolio centroid
    - Return top-k clauses farthest from the centroid (cosine distance)
    """
    _audit("anomalies", {"k": k})
    rows = []
    with SessionLocal() as db:
        # cast embedding to text so we can reliably parse
        res = db.execute(sqltext("""
            SELECT id, document_id, page_number, text, (embedding)::text AS embedding_text
            FROM ta.clauses
            WHERE embedding IS NOT NULL
        """)).all()
        rows = res

    if not rows:
        return {"count": 0, "results": []}

    # Build matrix (n, 384)
    embs = np.vstack([_parse_vector(r.embedding_text) for r in rows])

    # L2-normalize rows in case anything slipped through non-normalized
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    embs = embs / norms

    # Centroid
    centroid = embs.mean(axis=0)
    c_norm = np.linalg.norm(centroid)
    if c_norm == 0:
        return {"count": 0, "results": []}
    centroid = centroid / c_norm

    # Cosine distance = 1 - dot(u, v)
    dists = 1.0 - (embs @ centroid)

    # Top-k farthest
    idx = np.argsort(-dists)[:k]
    out = []
    for i in idx:
        r = rows[int(i)]
        out.append({
            "id": r.id,
            "document_id": r.document_id,
            "page_number": r.page_number,
            "distance": float(dists[i]),
            "text": r.text[:500],
        })
    return {"count": len(out), "results": out}

@router.get("/documents")
def list_documents():
    with SessionLocal() as db:
        res = db.execute(sqltext("""
            SELECT d.id, d.filename, d.uploaded_at,
                   COUNT(c.id) AS clause_count
            FROM ta.documents d
            LEFT JOIN ta.clauses c ON c.document_id = d.id
            GROUP BY d.id
            ORDER BY d.uploaded_at DESC, d.id DESC
        """)).all()
    return {
        "documents": [
            {
                "id": r.id,
                "filename": r.filename,
                "uploaded_at": r.uploaded_at.isoformat(),
                "clause_count": int(r.clause_count or 0),
            } for r in res
        ]
    }

@router.get("/documents/{doc_id}/clauses")
def doc_clauses(doc_id: int, limit: int = 100, offset: int = 0):
    with SessionLocal() as db:
        res = db.execute(sqltext("""
            SELECT id, page_number, left(text, 1000) AS text
            FROM ta.clauses
            WHERE document_id = :doc
            ORDER BY page_number, id
            LIMIT :limit OFFSET :offset
        """), {"doc": doc_id, "limit": limit, "offset": offset}).all()
    return {"document_id": doc_id, "clauses": [
        {"id": r.id, "page_number": r.page_number, "text": r.text} for r in res
    ]}

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int):
    with SessionLocal() as db:
        # cascade will delete clauses
        db.execute(sqltext("DELETE FROM ta.documents WHERE id = :id"), {"id": doc_id})
        db.commit()
    return {"deleted": doc_id}

@router.get("/documents/{doc_id}/file")
def stream_document_pdf(doc_id: int, x_api_key: str | None = Header(default=None)):
    """
    Streams decrypted PDF bytes (inline) for a given document.
    - looks up filename in DB
    - reads encrypted file from STORAGE_DIR
    - decrypts entirely (simple for demo), then streams as PDF
    """
    _require_api_key(x_api_key)

    with SessionLocal() as db:
        row = db.execute(sqltext("SELECT filename FROM ta.documents WHERE id = :id"),
                         {"id": doc_id}).one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        filename = row.filename

    enc_path = os.path.join(STORAGE_DIR, filename + ".enc")
    if not os.path.exists(enc_path):
        raise HTTPException(status_code=404, detail="Encrypted file not found")

    with open(enc_path, "rb") as f:
        enc = f.read()

    try:
        pdf_bytes = decrypt_bytes(enc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decrypt failed: {e}")

    # stream as PDF; for large files we could chunk + range, but this is fine for demo
    bio = io.BytesIO(pdf_bytes)
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        # Optional cache headers (tweak as you like)
        "Cache-Control": "no-store",
    }
    return StreamingResponse(bio, media_type="application/pdf", headers=headers)