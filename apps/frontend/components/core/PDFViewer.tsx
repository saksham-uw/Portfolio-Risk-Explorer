"use client";

import * as React from "react";
import * as pdfjs from "pdfjs-dist";

const worker = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
  { type: "module" }
);
(pdfjs as any).GlobalWorkerOptions.workerPort = worker;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { API_BASE } from "@/lib/api";
import { Home } from "lucide-react";

type Props = { docId: number };

export default function PDFViewer({ docId }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const pdfRef = React.useRef<any>(null);           // PDFDocumentProxy
  const renderTaskRef = React.useRef<any>(null);    // RenderTask
  const [numPages, setNumPages] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [scale, setScale] = React.useState<number>(1.2);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load + parse PDF
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${API_BASE}/documents/${docId}/file`;
        const res = await fetch(url, {
          headers: { "X-Api-Key": process.env.NEXT_PUBLIC_VIEW_TOKEN ?? "" },
        });
        if (!res.ok) throw new Error(`PDF fetch failed: ${res.status} ${res.statusText}`);

        const buf = await res.arrayBuffer();
        const loadingTask = (pdfjs as any).getDocument({ data: buf });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // best effort cancel any ongoing render
      try {
        renderTaskRef.current?.cancel();
      } catch {}
    };
  }, [docId]);

  // Render whenever page/scale changes
  React.useEffect(() => {
    if (!pdfRef.current || !canvasRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // cancel any previous render before starting a new one
        try {
          renderTaskRef.current?.cancel();
        } catch {}

        const pdf = pdfRef.current;
        const pageObj = await pdf.getPage(page);

        // Fit-to-width support when scale === -1 (magic flag)
        let finalScale = scale;
        if (scale === -1) {
          const viewportForWidth = pageObj.getViewport({ scale: 1 });
          const targetWidth = containerRef.current?.clientWidth ?? viewportForWidth.width;
          finalScale = Math.max(0.25, (targetWidth - 16 /* padding fudge */) / viewportForWidth.width);
        }

        const viewport = pageObj.getViewport({ scale: finalScale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const task = pageObj.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;

        await task.promise;
        if (cancelled) return;
      } catch (e: any) {
        if (e?.name === "RenderingCancelledException") return;
        console.error(e);
        setError(e?.message ?? "Render error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTaskRef.current?.cancel();
      } catch {}
    };
  }, [page, scale, numPages]);

  // Controls
  const canPrev = page > 1;
  const canNext = page < numPages;

  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);

  const zoomIn = () => setScale((s) => Math.min(4, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.25, s - 0.2));
  const resetZoom = () => setScale(1.0);
  const fitWidth = () => setScale(-1); // flag triggers fit-to-width logic

  // keyboard shortcuts: ←/→ for paging, +/- for zoom, 0 to reset
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { goNext(); }
      else if (e.key === "ArrowLeft") { goPrev(); }
      else if (e.key === "+" || e.key === "=") { zoomIn(); }
      else if (e.key === "-") { zoomOut(); }
      else if (e.key === "0") { resetZoom(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canNext, canPrev]);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2">
        <TooltipProvider>
            <Button variant="outline" onClick={() => window.location.href = `/dashboard`}><Home /></Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={goPrev} disabled={!canPrev}>
                ← Prev
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous page</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            <Input
              value={page}
              onChange={(e) => {
                const v = parseInt(e.target.value || "1", 10);
                if (Number.isFinite(v)) {
                  const clamped = Math.min(Math.max(v, 1), Math.max(numPages, 1));
                  setPage(clamped);
                }
              }}
              className="h-8 w-16 text-center"
            />
            <span className="text-sm text-muted-foreground">/ {numPages || "—"}</span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={goNext} disabled={!canNext}>
                Next →
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next page</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-2 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={zoomOut}>−</Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={resetZoom}>100%</Button>
            </TooltipTrigger>
            <TooltipContent>Reset zoom</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={zoomIn}>+</Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={fitWidth}>Fit width</Button>
            </TooltipTrigger>
            <TooltipContent>Scale to container width</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="ml-auto text-sm text-muted-foreground">
          {loading ? "Loading…" : error ? `Error: ${error}` : `Page ${page} of ${numPages}`}
        </div>
      </div>

      <Separator />

      {/* Canvas */}
      <div ref={containerRef} className="w-full overflow-auto p-2">
        <canvas ref={canvasRef} className="mx-auto block" />
      </div>
    </div>
  );
}
