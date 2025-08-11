"use client";
import * as React from "react";
import { api } from "@/lib/api";

export function DocumentsPanel({ onPick }: { onPick?: (id:number)=>void }) {
  const [docs, setDocs] = React.useState<Awaited<ReturnType<typeof api.documents>> | null>(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    api.documents().then(setDocs).catch(e=>setErr(String(e)));
  }, []);

  if (err) return <div className="text-red-600 text-sm">{err}</div>;
  if (!docs) return <div className="text-sm text-muted-foreground">Loading documents…</div>;

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Filename</th>
            <th className="px-3 py-2 text-left">Uploaded</th>
            <th className="px-3 py-2 text-left">Clauses</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {docs.documents.map(d => (
            <tr key={d.id} className="border-t">
              <td className="px-3 py-2">{d.id}</td>
              <td className="px-3 py-2">{d.filename}</td>
              <td className="px-3 py-2">{new Date(d.uploaded_at).toLocaleString()}</td>
              <td className="px-3 py-2">{d.clause_count}</td>
              <td className="px-3 py-2">
                <button className="border rounded px-2 py-1" onClick={()=>onPick?.(d.id)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
