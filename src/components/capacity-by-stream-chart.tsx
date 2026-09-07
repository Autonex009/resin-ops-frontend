"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
  ceiling: {
    label: "Ceiling",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function CapacityByStreamChart({ data }: { data: StreamCapacityPoint[] }) {
  // Determine if it's the feeder ceiling. In our data, Mixed Bed is usually the ceiling constraint.
  const rows = data.map((d) => ({
    ...d,
    streamLabel: STREAM_LABELS[d.stream] ?? d.stream,
    isCeiling: d.stream === "mixed_bed" // From user design, mixed bed is highlighted
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="streamLabel"
          tickLine={false}
          axisLine={false}
          width={78}
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
        <Bar dataKey="utilizationPct" radius={[0, 4, 4, 0]} barSize={22}>
          {rows.map((row, i) => (
            <Cell
              key={i}
              fill={row.isCeiling ? "var(--color-ceiling)" : "var(--color-utilizationPct)"}
            />
          ))}
          <LabelList
            dataKey="utilizationPct"
            position="right"
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
