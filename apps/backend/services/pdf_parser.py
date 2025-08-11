from __future__ import annotations
import re
from typing import List, Dict
import fitz  # PyMuPDF

def extract_text_by_page(pdf_bytes: bytes) -> List[Dict]:
    """Return [{'page_number': int, 'text': str}, ...]"""
    chunks: List[Dict] = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text")
            if text and text.strip():
                chunks.append({"page_number": i, "text": text})
    return chunks

_HEADING_RE = re.compile(r"^\s*(ARTICLE|SECTION|CLAUSE|ENDORSEMENT)\b.*", re.IGNORECASE)

def chunk_clauses(pages: List[Dict], max_len: int = 1200) -> List[Dict]:
    """
    Very simple clause chunking:
      - split page text by blank lines
      - start a new chunk when a heading-like line appears
      - keep chunks under ~max_len chars
    """
    results: List[Dict] = []
    for p in pages:
        page_no = p["page_number"]
        parts = re.split(r"\n\s*\n", p["text"])
        cur: list[str] = []
        cur_len = 0

        def flush():
            nonlocal cur, cur_len
            if cur:
                text = "\n".join(cur).strip()
                if text:
                    results.append({"page_number": page_no, "text": text})
                cur = []
                cur_len = 0

        for block in parts:
            block = block.strip()
            if not block:
                continue
            # Heading? start a new chunk
            if _HEADING_RE.match(block) and cur:
                flush()
            # Accumulate with size guard
            if cur_len + len(block) > max_len and cur:
                flush()
            cur.append(block)
            cur_len += len(block)

        flush()
    return results
