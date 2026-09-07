"use client";

import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
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
  actualCum: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  plannedCum: {
    label: "Planned",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function PlanVsActualCumulativeChart({ data }: { data: DailyRow[] }) {
  const rows = data.reduce<
    { d: string; actualCum: number; plannedCum: number }[]
  >((acc, d) => {
    const prev = acc[acc.length - 1];
    const date = new Date(d.day);
    acc.push({
      d: String(date.getUTCDate()).padStart(2, "0"),
      actualCum: (prev?.actualCum ?? 0) + Number(d.actual),
      plannedCum: (prev?.plannedCum ?? 0) + Number(d.planned),
    });
    return acc;
  }, []);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <AreaChart data={rows} margin={{ left: -12, right: 12, top: 16, bottom: 0 }}>
        <defs>
          <linearGradient id="fillActualCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-actualCum)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-actualCum)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(value) => `Day ${value}`} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="plannedCum"
          type="stepAfter"
          stroke="var(--color-plannedCum)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
        <Area
          dataKey="actualCum"
          type="monotone"
          stroke="var(--color-actualCum)"
          strokeWidth={2}
          fill="url(#fillActualCum)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
