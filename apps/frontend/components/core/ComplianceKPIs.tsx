"use client";
import * as React from "react";
import { api } from "@/lib/api";

export function ComplianceKpis({ refreshToken }: { refreshToken?: number }) {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof api.compliance>> | null>(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    setErr("");
    setData(null);
    api.compliance().then(setData).catch(e => setErr(String(e)));
  }, [refreshToken]);

  if (err) return <div className="text-red-600 text-sm">{err}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Loading KPIs…</div>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {data.rules.slice(0,4).map(r => (
        <div key={r.rule_id} className="rounded-xl border p-4 bg-gradient-to-t from-primary/5 to-card">
          <div className="text-xs text-muted-foreground">{r.name}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{r.coverage_pct}%</div>
        </div>
      ))}
    </div>
  );
}