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
from typing import List, Optional
from fastapi import Query
from sqlalchemy import text as sqltext

router = APIRouter()
STORAGE_DIR = os.getenv("STORAGE_DIR", "storage")

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
