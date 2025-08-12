"use client";

import * as React from "react";
// ESM build
import * as pdfjs from "pdfjs-dist";

// Spin up a real module worker for Next.js
const worker = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
  { type: "module" }
);
// Tell pdf.js to use our worker
// (alternative is GlobalWorkerOptions.workerSrc = "...", but workerPort is cleanest)
;(pdfjs as any).GlobalWorkerOptions.workerPort = worker;

import { API_BASE } from "@/lib/api";

type Props = { docId: number };

export default function PDFViewer({ docId }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      // Server route: GET /api/documents/{doc_id}/file
      const url = `${API_BASE}/documents/${docId}/file`;

      // Send API key via header — FastAPI Header(...) maps to "X-Api-Key"
      const res = await fetch(url, {
        headers: { "X-Api-Key": process.env.NEXT_PUBLIC_VIEW_TOKEN ?? "" },
      });
      if (!res.ok) throw new Error(`PDF fetch failed: ${res.statusText}`);

      const buf = await res.arrayBuffer();

      const loadingTask = (pdfjs as any).getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      if (cancelled) return;

      // Render page 1 (you can add paging later)
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [docId]);

  return (
    <div className="w-full overflow-auto rounded border bg-background p-2">
      <canvas ref={canvasRef} />
    </div>
  );
}
