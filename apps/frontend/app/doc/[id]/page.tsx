"use client";
import * as React from "react";
import { useSearchParams, useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function DocPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const pageParam = Number(search.get("page") ?? "1");
  const id = Number(params.id);
  const [data, setData] = React.useState<Awaited<ReturnType<typeof api.docClauses>> | null>(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    api.docClauses(id, 500, 0).then(setData).catch(e=>setErr(String(e)));
  }, [id]);

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Document {id}</h1>
      <div className="space-y-2">
        {data.clauses.map(c => (
          <div key={c.id} className={`rounded border p-3 ${c.page_number===pageParam ? "ring-2 ring-primary" : ""}`}>
            <div className="text-xs text-muted-foreground mb-1">Page {c.page_number}</div>
            <div className="whitespace-pre-wrap">{c.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
