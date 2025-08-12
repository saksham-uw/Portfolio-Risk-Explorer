"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type AnomalyRow = {
  id: number;
  document_id: number;
  page_number: number;
  distance: number;
  text: string;
};
type AnomaliesRes = { count: number; results: AnomalyRow[] };

export function AnomaliesTable({ refreshToken }: { refreshToken: number }) {
  const [data, setData] = React.useState<AnomaliesRes | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    api.anomalies(10)
      .then(setData)
      .finally(() => setLoading(false));
  }, [refreshToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Anomalies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Doc</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Snippet</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.results ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.document_id}</TableCell>
                  <TableCell>{r.page_number}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.distance.toFixed(3)}
                  </TableCell>
                  <TableCell className="max-w-[520px] truncate">{r.text}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => (window.location.href = `/doc/${r.document_id}/viewer`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!loading && (data?.results ?? []).length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No anomalies found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
