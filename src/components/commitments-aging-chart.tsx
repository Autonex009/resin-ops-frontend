"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, LabelList } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { AgingBucket } from "@/lib/api-client";

const chartConfig = {
  count: {
    label: "Commitments",
  },
} satisfies ChartConfig;

function getBucketColor(bucket: string) {
  if (bucket === "Overdue") return "var(--destructive)";
  if (bucket === "0-3d" || bucket === "4-7d") return "var(--chart-4)";
  return "var(--chart-1)";
}

export function CommitmentsAgingChart({ data }: { data: AgingBucket[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={34}>
          {data.map((row) => (
            <Cell
              key={row.bucket}
              fill={getBucketColor(row.bucket)}
            />
          ))}
          <LabelList dataKey="count" position="top" className="fill-foreground text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
