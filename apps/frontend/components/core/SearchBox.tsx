"use client";
import * as React from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export function SearchBox() {
    const [q, setQ] = React.useState("");
    const [res, setRes] = React.useState<Awaited<ReturnType<typeof api.search>> | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState("");

    async function onSearch(e?: React.FormEvent) {
        e?.preventDefault();
        if (!q.trim()) return;
        setLoading(true); setErr("");
        try { setRes(await api.search(q, 5)); } catch (e: any) { setErr(String(e)); }
        finally { setLoading(false); }
    }

    return (
        <div className="space-y-3">
            <form onSubmit={onSearch} className="flex gap-2">
                <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder='Try "PFAS exclusion" or "SRCC 72 hours"'
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <button className="rounded-lg border px-3 py-2" type="submit" disabled={loading}>
                    {loading ? "Searching…" : "Search"}
                </button>
            </form>
            {err && <div className="text-red-600 text-sm">{err}</div>}
            {res && (
                <div className="rounded-xl border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-3 py-2 text-left">Doc</th>
                                <th className="px-3 py-2 text-left">Page</th>
                                <th className="px-3 py-2 text-left">Score</th>
                                <th className="px-3 py-2 text-left">Snippet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {res.results.map(r => (
                                <tr key={r.id} className="border-t">
                                    <td className="px-3 py-2">
                                        <Link className="underline" href={`/doc/${r.document_id}/viewer?page=${r.page_number}`}>
                                            {r.document_id}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2">{r.page_number}</td>
                                    <td className="px-3 py-2 tabular-nums">{r.score.toFixed(3)}</td>
                                    <td className="px-3 py-2">{r.text}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
