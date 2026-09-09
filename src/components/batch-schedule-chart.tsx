"use client";

import { Pie, PieChart, Cell, Tooltip } from "recharts";
import type { BatchScheduleSummary } from "@/lib/api-client";

export function BatchScheduleChart({ data }: { data: BatchScheduleSummary }) {
  const rows = [
    { name: "On track", value: data.onTrack, color: "var(--chart-2)" },
    { name: "Behind", value: data.behind, color: "var(--destructive)" },
  ];

  const total = data.onTrack + data.behind;
  const onTrackPct = total > 0 ? Math.round((data.onTrack / total) * 100) : 0;

  return (
    <div className="flex h-[220px] w-full items-center justify-center gap-8">
      <div className="h-[160px] w-[160px] shrink-0">
        <PieChart width={160} height={160}>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx={78}
            cy={78}
            innerRadius={48}
            outerRadius={76}
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {rows.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
            }}
            itemStyle={{ color: "var(--popover-foreground)" }}
          />
        </PieChart>
      </div>
      <div className="shrink-0">
        {rows.map((d) => (
          <div key={d.name} className="mb-2.5 flex items-center gap-2">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: d.color }}
            />
            <span className="text-sm text-foreground">{d.name}</span>
            <span className="ml-1 font-mono text-sm tabular-nums text-muted-foreground">
              {d.value}
            </span>
          </div>
        ))}
        <div className="mt-3 text-xs text-muted-foreground">
          {onTrackPct}% on track
        </div>
      </div>
    </div>
  );
}
