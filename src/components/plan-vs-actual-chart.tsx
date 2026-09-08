"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DailyRow } from "@/lib/api-client";

const chartConfig = {
  actualNum: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  plannedNum: {
    label: "Planned",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PlanVsActualChart({ data }: { data: DailyRow[] }) {
  const rows = data.map((d) => {
    const date = new Date(d.day);
    return {
      ...d,
      d: String(date.getUTCDate()).padStart(2, "0"),
      plannedNum: Number(d.planned),
      actualNum: Number(d.actual),
    };
  });

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <BarChart data={rows} margin={{ left: -12, right: 12, top: 16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="d"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={10}
          interval={1}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => `Day ${value}`}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="plannedNum" fill="var(--color-plannedNum)" name="Planned" radius={[2, 2, 0, 0]} />
        <Bar dataKey="actualNum" fill="var(--color-actualNum)" name="Actual" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
