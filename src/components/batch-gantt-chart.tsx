"use client";

import { useMemo } from "react";
import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { Batch } from "@/lib/api-client";

const STREAM_LABELS: Record<string, string> = {
  cation: "Cation",
  anion: "Anion",
  mixed_bed: "Mixed Bed",
};

const chartConfig = { batch: { label: "Batch" } } satisfies ChartConfig;

function isBehindSchedule(plannedCompletion: string, actualCompletion: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (actualCompletion) return actualCompletion > plannedCompletion;
  return plannedCompletion < today;
}

function dayMs(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

type Point = {
  x: number;
  row: string;
  batchNumber: string;
  status: string;
  behind: boolean;
  plannedCompletion: string;
  actualCompletion: string | null;
  color: string;
};

function GanttTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-mono text-sm font-semibold">{p.batchNumber}</div>
      <div className="text-muted-foreground">{p.row}</div>
      <div className="mt-1.5 space-y-0.5">
        <div>Status: {p.status.replace("_", " ")}</div>
        <div>Planned: {p.plannedCompletion}</div>
        {p.actualCompletion && <div>Actual: {p.actualCompletion}</div>}
        {p.behind && <div className="font-medium text-destructive">Behind schedule</div>}
      </div>
    </div>
  );
}

export function BatchGanttChart({ batches }: { batches: Batch[] }) {
  const { points, rows, minIdx, maxIdx, todayIdx, base } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (batches.length === 0) {
      return { points: [] as Point[], rows: [] as string[], minIdx: 0, maxIdx: 0, todayIdx: 0, base: dayMs(today) };
    }

    const allDates = [
      ...batches.flatMap((b) => [b.plannedCompletion, b.actualCompletion].filter((d): d is string => Boolean(d))),
      today,
    ];
    const base = Math.min(...allDates.map(dayMs));
    const toIdx = (d: string) => Math.round((dayMs(d) - base) / 86_400_000);

    const rowSet = new Set<string>();
    const points: Point[] = batches.map((b) => {
      const row = `${b.plant.code} · ${STREAM_LABELS[b.stream] ?? b.stream}`;
      rowSet.add(row);
      const behind = isBehindSchedule(b.plannedCompletion, b.actualCompletion);
      // chart-1 is itself a red tone in this brand palette, too close to
      // destructive to read as a distinct "fine" signal at a 5px dot size —
      // use a neutral gray for anything not behind/completed instead.
      const color =
        b.status === "delayed" || behind
          ? "var(--destructive)"
          : b.status === "completed"
            ? "var(--chart-2)"
            : "var(--muted-foreground)";
      return {
        x: toIdx(b.actualCompletion ?? b.plannedCompletion),
        row,
        batchNumber: b.batchNumber,
        status: b.status,
        behind,
        plannedCompletion: b.plannedCompletion,
        actualCompletion: b.actualCompletion,
        color,
      };
    });

    const rows = Array.from(rowSet).sort();
    const todayIdx = toIdx(today);
    const xs = [...points.map((p) => p.x), todayIdx];

    return { points, rows, minIdx: Math.min(...xs), maxIdx: Math.max(...xs), todayIdx, base };
  }, [batches]);

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No batches to plot.</p>;
  }

  const formatTick = (idx: number) =>
    new Date(base + idx * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: Math.max(220, rows.length * 40 + 40) }}
    >
      <ScatterChart margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[minIdx - 1, maxIdx + 1]}
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="row"
          allowDuplicatedCategory={false}
          width={110}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ReferenceLine x={todayIdx} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <ChartTooltip content={<GanttTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter
          data={points}
          shape={(props) => {
            const { cx, cy, payload } = props as unknown as { cx?: number; cy?: number; payload?: Point };
            if (cx === undefined || cy === undefined || !payload) return <g />;
            return <circle cx={cx} cy={cy} r={5} fill={payload.color} stroke="none" />;
          }}
        />
      </ScatterChart>
    </ChartContainer>
  );
}
