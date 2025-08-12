"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type DocRow = { id: number; filename: string; uploaded_at: string };

export function DocumentsPanel({
  onView,
  refreshToken,
}: {
  onView: (id: number) => void;
  refreshToken: number;
}) {
  const [docs, setDocs] = React.useState<DocRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    api.documents()
      .then((d) => setDocs(d.documents ?? d))
      .finally(() => setLoading(false));
  }, [refreshToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell className="max-w-[520px] truncate">{d.filename}</TableCell>
                  <TableCell>{new Date(d.uploaded_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(d.id)}
                    >
                      View PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!loading && docs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No documents yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
