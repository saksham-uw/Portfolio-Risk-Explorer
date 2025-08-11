"use client";
import * as React from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export function AnomaliesTable({ refreshToken }: { refreshToken?: number }) {
    const [data, setData] = React.useState<Awaited<ReturnType<typeof api.anomalies>> | null>(null);
    const [err, setErr] = React.useState("");

    React.useEffect(() => {
        setErr("");
        setData(null);
        api.anomalies(10).then(setData).catch(e => setErr(String(e)));
    }, [refreshToken]);

    if (err) return <div className="text-red-600 text-sm">{err}</div>;
    if (!data) return <div className="text-sm text-muted-foreground">Loading anomalies…</div>;

    return (
        <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted">
                    <tr>
                        <th className="px-3 py-2 text-left">Doc</th>
                        <th className="px-3 py-2 text-left">Page</th>
                        <th className="px-3 py-2 text-left">Distance</th>
                        <th className="px-3 py-2 text-left">Snippet</th>
                    </tr>
                </thead>
                <tbody>
                    {data.results.map(r => (
                        <tr key={r.id} className="border-t">
                            <td className="px-3 py-2">
                                <Link className="underline" href={`/doc/${r.document_id}/viewer?page=${r.page_number}`}>
                                    {r.document_id}
                                </Link>
                            </td>
                            <td className="px-3 py-2">{r.page_number}</td>
                            <td className="px-3 py-2 tabular-nums">{r.distance.toFixed(3)}</td>
                            <td className="px-3 py-2">{r.text}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
