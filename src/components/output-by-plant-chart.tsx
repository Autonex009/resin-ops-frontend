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
import type { PlantOutputPoint } from "@/lib/api-client";

const chartConfig = {
  actual: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  planned: {
    label: "Planned",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function OutputByPlantChart({ data }: { data: PlantOutputPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: `${d.plantName} (${d.plantCode})` }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={rows} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="planned" fill="var(--color-planned)" radius={[3, 3, 0, 0]} barSize={26} />
        <Bar dataKey="actual" fill="var(--color-actual)" radius={[3, 3, 0, 0]} barSize={26} />
      </BarChart>
    </ChartContainer>
  );
}
