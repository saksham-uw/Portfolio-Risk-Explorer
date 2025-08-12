export const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api";

async function getJSON<T>(path: string) {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET ${path} ${res.status} ${text}`);
    }
    return (await res.json()) as T;
}

export type SearchResult = {
    query: string;
    results: {
        id: number;
        document_id: number;
        page_number: number;
        score: number;
        text: string;
    }[];
};

export type ComplianceSummary = {
    total_documents: number;
    rules: {
        rule_id: string;
        name: string;
        coverage_pct: number;
        compliant_docs: number[];
        non_compliant_docs: number[];
    }[];
};

export type Anomalies = {
    count: number;
    results: {
        id: number;
        document_id: number;
        page_number: number;
        distance: number;
        text: string;
    }[];
};

export type DocumentsList = {
    documents: { id: number; filename: string; uploaded_at: string; clause_count: number }[];
};

export const api = {
    search: (q: string, k = 5) =>
        getJSON<SearchResult>(`/search?q=${encodeURIComponent(q)}&k=${k}`),

    compliance: () => getJSON<ComplianceSummary>("/compliance"),

    anomalies: (k = 10) => getJSON<Anomalies>(`/anomalies?k=${k}`),

    documents: () => getJSON<DocumentsList>("/documents"),

    docClauses: (id: number, limit = 100, offset = 0) =>
        getJSON<{ document_id: number; clauses: { id: number; page_number: number; text: string }[] }>(
            `/documents/${id}/clauses?limit=${limit}&offset=${offset}`
        ),
    upload: (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return fetch(`${API_BASE}/upload`, { method: "POST", body: fd }).then(() => true);
    },
    streamUrl: (docId: number) => {
        const key = process.env.NEXT_PUBLIC_VIEW_TOKEN ?? "";
        // This endpoint serves decrypted bytes with Range support
        return `${API_BASE}/doc/${docId}/stream?x-api-key=${encodeURIComponent(
            key
        )}`;
    },
};
