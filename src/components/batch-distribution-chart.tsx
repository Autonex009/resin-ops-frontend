"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DistributionSlice = { name: string; value: number; color: string };

export function BatchDistributionChart({
  byStatus,
  bySchedule,
}: {
  byStatus: DistributionSlice[];
  bySchedule: DistributionSlice[];
}) {
  const [mode, setMode] = useState<"status" | "schedule">("status");
  const data = (mode === "status" ? byStatus : bySchedule).filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit rounded-md border border-border p-0.5">
        {(["status", "schedule"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-[5px] px-3 py-1 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "status" ? "By Status" : "By Schedule"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-6">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {data.map((d) => (
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
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px]" style={{ background: d.color }} />
              <span className="text-sm text-foreground">{d.name}</span>
              <span className="ml-1 font-mono text-sm tabular-nums text-muted-foreground">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
