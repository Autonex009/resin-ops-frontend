"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

type GaugeTone = "primary" | "success" | "warning" | "destructive";

const toneVar: Record<GaugeTone, string> = {
  primary: "var(--chart-1)",
  success: "var(--chart-2)",
  warning: "var(--chart-3)",
  destructive: "var(--chart-5)",
};

/**
 * A compact half-donut gauge for a single 0–100% metric.
 * Used on the Overview to give plan attainment and capacity utilization
 * an at-a-glance read alongside the KPI tiles.
 */
export function RadialGaugeChart({
  value,
  label,
  caption,
  tone = "primary",
}: {
  value: number | null;
  label: string;
  caption?: string;
  tone?: GaugeTone;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const color = toneVar[tone];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 120 }}>
        <RadialBarChart
          width={140}
          height={120}
          data={[{ value: pct, fill: color }]}
          startAngle={210}
          endAngle={-30}
          innerRadius="72%"
          outerRadius="100%"
          barSize={14}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "var(--muted)" }}
            dataKey="value"
            cornerRadius={8}
            isAnimationActive={false}
          />
        </RadialBarChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {value === null ? "—" : `${Math.round(pct)}%`}
          </span>
        </div>
      </div>
      <div className="mt-1 text-center">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {caption && (
          <div className="text-xs text-muted-foreground">{caption}</div>
        )}
      </div>
    </div>
  );
}
