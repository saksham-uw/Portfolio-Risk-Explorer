"use client";

import * as React from "react";
import { API_BASE } from "@/lib/api";

type Props = {
  onUploaded?: (info: { document_id: number; clauses_inserted: number }) => void;
};

export function UploadPanel({ onUploaded }: Props) {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!file) {
      setMsg("Choose a PDF first.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setMsg("Only PDF files are allowed.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as {
        document_id: number;
        clauses_inserted: number;
      };
      setMsg(
        `Uploaded ✅ doc_id=${json.document_id}, clauses=${json.clauses_inserted}`
      );
      onUploaded?.(json);
      setFile(null);
      (document.getElementById("pdf-input") as HTMLInputElement | null)!.value =
        "";
    } catch (err: any) {
      setMsg(`Upload failed: ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-3 rounded-xl border p-4">
      <div className="text-base font-semibold">Upload Treaty PDF</div>
      <input
        id="pdf-input"
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full rounded-lg border px-3 py-2"
      />
      {file && (
        <div className="text-xs text-muted-foreground">
          {file.name} • {(file.size / 1024).toFixed(1)} KB
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !file}
          className="rounded-lg border px-3 py-2 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            (document.getElementById("pdf-input") as HTMLInputElement | null)!.value =
              "";
            setMsg("");
          }}
          className="rounded-lg border px-3 py-2"
        >
          Clear
        </button>
      </div>
      {msg && <div className="text-sm">{msg}</div>}
      <div className="text-xs text-muted-foreground">
        Files are encrypted at rest in your local storage dir, then parsed and
        chunked; embeddings are written to Postgres (pgvector).
      </div>
    </form>
  );
}
