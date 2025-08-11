"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import PdfViewer from "@/components/core/PDFViewer";

export default function ViewerPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const search = useSearchParams();
  const page = Number(search.get("page") ?? "1");

  // If you set an API key on backend, expose it in .env.local for dev only
  const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? undefined;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-semibold">Document {id} — PDF Viewer</h1>
      <PdfViewer docId={id} page={page} apiKey={apiKey} />
      <p className="text-xs text-muted-foreground">
        Rendering with pdf.js. Use the URL param <code>?page=</code> to deep-link to a page.
      </p>
    </div>
  );
}
