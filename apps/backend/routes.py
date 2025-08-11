"""
API routes for the Portfolio Risk Explorer application.

This module contains all the API endpoints for handling PDF uploads and document processing.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import text
from db import SessionLocal
from services.crypto import encrypt_bytes, ensure_dir
from services.pdf_parser import extract_text_by_page, chunk_clauses
from services.embeddings import embed_text
import os
import numpy as np
from typing import List, Optional
from fastapi import Query
from sqlalchemy import text as sqltext
from services.compliance_checker import load_rules, evaluate_rules_on_clauses

router = APIRouter()
STORAGE_DIR = os.getenv("STORAGE_DIR", "storage")

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
