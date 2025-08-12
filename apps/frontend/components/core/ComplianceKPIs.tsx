"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis } from "recharts";

type Compliance = {
  total_documents: number;
  rules: { rule_id: string; name: string; coverage_pct: number }[];
};

export function ComplianceKPIs({ refreshToken }: { refreshToken: number }) {
  const [data, setData] = React.useState<Compliance | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    api.compliance()
      .then(setData)
      .finally(() => setLoading(false));
  }, [refreshToken]);

  const coverageSeries =
    data?.rules.map((r, i) => ({ idx: i + 1, name: r.rule_id, value: r.coverage_pct })) ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Total Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">
            {data?.total_documents ?? (loading ? "…" : 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">In portfolio</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Compliance Coverage by Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              value: { label: "Coverage %", color: "var(--primary)" },
            }}
            className="h-[230px]"
          >
            <AreaChart data={coverageSeries}>
              <defs>
                <linearGradient id="fillCoverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="value"
                type="natural"
                fill="url(#fillCoverage)"
                stroke="var(--color-value)"
              />
            </AreaChart>
          </ChartContainer>

          <div className="mt-3 flex flex-wrap gap-2">
            {data?.rules.map((r) => (
              <Badge key={r.rule_id} variant="outline">
                {r.name}: <span className="ml-1 font-medium">{r.coverage_pct}%</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
