"use client";

import { Area, Line, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DailyTrendPoint } from "@/lib/api-client";

const chartConfig = {
  actual: {
    label: "Actual (cumulative)",
    color: "var(--chart-1)",
  },
  target: {
    label: "Target pace",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

function formatDay(value: string) {
  const d = new Date(`${value}T00:00:00Z`);
  return String(d.getUTCDate());
}

export function DailyTrendChart({ data }: { data: DailyTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-actual)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-actual)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickFormatter={formatDay}
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          tickMargin={8}
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
              labelFormatter={(value) => `Day ${formatDay(String(value))}`}
              indicator="dot"
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="target"
          type="linear"
          stroke="var(--color-target)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
        <Area
          dataKey="actual"
          type="monotone"
          stroke="var(--color-actual)"
          strokeWidth={2}
          fill="url(#fillActual)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
