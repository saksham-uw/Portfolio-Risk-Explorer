"use client";

import * as React from "react";
import { api } from "@/lib/api";

export default function DebugPage() {
  const [health, setHealth] = React.useState<any>(null);
  const [compliance, setCompliance] = React.useState<any>(null);
  const [anoms, setAnoms] = React.useState<any>(null);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      try {
        const h = await fetch(
          (process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api").replace(
            /\/api$/,""
          ) + "/health",
          { cache: "no-store" }
        ).then(r => r.json());
        setHealth(h);

        const c = await api.compliance();
        setCompliance(c);

        const a = await api.anomalies(5);
        setAnoms(a);
      } catch (e:any) {
        setError(e.message ?? String(e));
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Debug API</h1>
      {error && <pre className="text-red-600">{error}</pre>}
      <section>
        <h2 className="text-lg font-medium">/health</h2>
        <pre className="text-sm bg-black/5 p-3 rounded">{JSON.stringify(health, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-lg font-medium">/api/compliance</h2>
        <pre className="text-sm bg-black/5 p-3 rounded">{JSON.stringify(compliance, null, 2)}</pre>
      </section>
      <section>
        <h2 className="text-lg font-medium">/api/anomalies</h2>
        <pre className="text-sm bg-black/5 p-3 rounded">{JSON.stringify(anoms, null, 2)}</pre>
      </section>
    </div>
  );
}
