// app/doc/[id]/viewer/page.tsx
"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("@/components/core/PDFViewer"), { ssr: false });

export default function ViewerPage() {
  const params = useParams<{ id: string }>();
  const docId = Number(params.id);
  return <PDFViewer docId={docId} />;
}
