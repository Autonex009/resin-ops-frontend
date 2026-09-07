"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis, LabelList } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { StreamCapacityPoint } from "@/lib/api-client";

const STREAM_LABELS: Record<string, string> = {
  cation: "Cation",
  anion: "Anion",
  mixed_bed: "Mixed Bed",
};

const chartConfig = {
  utilizationPct: {
    label: "Utilization",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function MixedBedDependencyChart({ data }: { data: StreamCapacityPoint[] }) {
  const rows = data.map((d) => ({ ...d, streamLabel: STREAM_LABELS[d.stream] ?? d.stream }));
  const cationPct = rows.find((r) => r.stream === "cation")?.utilizationPct ?? 0;
  const anionPct = rows.find((r) => r.stream === "anion")?.utilizationPct ?? 0;
  const feederCeiling = Math.min(cationPct, anionPct);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={rows} margin={{ left: 4, right: 12, top: 24, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="streamLabel" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => {
                const row = item?.payload as (typeof rows)[number] | undefined;
                return [
                  `${value}% (${row?.actual.toLocaleString()} of ${row?.capacity.toLocaleString()})`,
                  "Utilization",
                ];
              }}
            />
          }
        />
        <ReferenceLine 
          y={feederCeiling} 
          stroke="var(--chart-4)" 
          strokeDasharray="4 4" 
          strokeWidth={1.5}
          label={{ 
            value: `Ceiling ${Math.round(feederCeiling)}%`, 
            fontSize: 11, 
            fill: "var(--chart-4)", 
            position: "insideTopRight" 
          }}
        />
        <Bar dataKey="utilizationPct" fill="var(--color-utilizationPct)" radius={4} maxBarSize={64}>
          <LabelList
            dataKey="utilizationPct"
            position="top"
            className="fill-foreground text-xs"
            formatter={(value: unknown) =>
              value === undefined || value === null ? "" : `${value}%`
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
