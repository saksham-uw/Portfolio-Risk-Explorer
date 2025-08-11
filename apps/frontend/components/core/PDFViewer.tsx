"use client";

import * as React from "react";
// Use the ESM build for tree-shaking
import * as pdfjs from "pdfjs-dist";
// ⬇️ Instead of ?worker, create a real Worker from the worker file
const worker = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
  { type: "module" }
);

// Tell pdf.js to use our worker instance
// (You can also set GlobalWorkerOptions.workerSrc to a URL string,
// but workerPort is the cleanest in Next.)
(pdfjs as any).GlobalWorkerOptions.workerPort = worker;

import { API_BASE } from "@/lib/api";

type Props = { docId: number; fileName: string };

export default function PDFViewer({ docId, fileName }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = `${API_BASE}/documents/${docId}/file?filename=${encodeURIComponent(
        fileName
      )}`;

      // Fetch as ArrayBuffer so pdf.js can stream/decode
      const res = await fetch(url, {
        headers: { "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY ?? "" },
      });
      const buf = await res.arrayBuffer();

      const loadingTask = (pdfjs as any).getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      if (cancelled) return;

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
  }, [docId, fileName]);

  return (
    <div className="w-full overflow-auto rounded border bg-background p-2">
      <canvas ref={canvasRef} />
    </div>
  );
}
