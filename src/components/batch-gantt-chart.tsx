"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  XAxis,
  YAxis,
} from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { Batch } from "@/lib/api-client";

const STREAM_LABELS: Record<string, string> = {
  cation: "Cation",
  anion: "Anion",
  mixed_bed: "Mixed Bed",
};

const chartConfig = { batch: { label: "Batch" } } satisfies ChartConfig;

const ROW_HEIGHT = 52;
const DOT_RADIUS = 6;
const BAR_HEIGHT = 14;

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
  plannedIdx: number;
  row: string;
  batchNumber: string;
  status: string;
  behind: boolean;
  plannedCompletion: string;
  actualCompletion: string | null;
  color: string;
};

type SlipBar = { row: string; from: number; to: number; color: string };
type MonthTick = { idx: number; label: string };

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

// Draws the planned->actual slip bars using the chart's own scales, so they
// line up exactly with the dots rendered by <Scatter>. Recharts 3 dropped
// <Customized> in favor of rendering elements straight into the chart tree
// and reading position via these scale hooks.
function SlipBars({ bars }: { bars: SlipBar[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale || bars.length === 0) return null;

  return (
    <g>
      {bars.map((bar, i) => {
        const x1 = xScale(bar.from);
        const x2 = xScale(bar.to);
        const y = yScale(bar.row, { position: "middle" });
        if (x1 === undefined || x2 === undefined || y === undefined) return null;
        const left = Math.min(x1, x2);
        const width = Math.max(Math.abs(x2 - x1), BAR_HEIGHT / 2);
        return (
          <rect
            key={i}
            x={left}
            y={y - BAR_HEIGHT / 2}
            width={width}
            height={BAR_HEIGHT}
            rx={BAR_HEIGHT / 2}
            fill={bar.color}
            opacity={0.85}
          />
        );
      })}
    </g>
  );
}

// A second <XAxis> bound to its own xAxisId never gets a valid scale here
// since no series references that id — so the month header is drawn as plain
// text in the chart's reserved top margin instead, using the same
// plot-area/scale hooks as <SlipBars>.
function MonthHeader({ ticks }: { ticks: MonthTick[] }) {
  const xScale = useXAxisScale();
  const plotArea = usePlotArea();
  if (!xScale || !plotArea || ticks.length === 0) return null;

  return (
    <g>
      {ticks.map((t) => {
        const x = xScale(t.idx);
        if (x === undefined) return null;
        return (
          <text
            key={t.idx}
            x={x + 6}
            y={plotArea.y - 10}
            fontSize={12}
            fontWeight={600}
            fill="var(--foreground)"
          >
            {t.label}
          </text>
        );
      })}
    </g>
  );
}

export function BatchGanttChart({ batches }: { batches: Batch[] }) {
  const { points, slipBars, rows, minIdx, maxIdx, todayIdx, base, monthTicks } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (batches.length === 0) {
      return {
        points: [] as Point[],
        slipBars: [] as SlipBar[],
        rows: [] as string[],
        minIdx: 0,
        maxIdx: 0,
        todayIdx: 0,
        base: dayMs(today),
        monthTicks: [] as MonthTick[],
      };
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
        plannedIdx: toIdx(b.plannedCompletion),
        row,
        batchNumber: b.batchNumber,
        status: b.status,
        behind,
        plannedCompletion: b.plannedCompletion,
        actualCompletion: b.actualCompletion,
        color,
      };
    });

    // A bar only means something real for batches that actually finished:
    // its length is the genuine planned->actual gap. Batches still pending
    // (no actual yet) have nothing to bar to, so they stay dots only.
    const slipBars: SlipBar[] = points
      .filter((p) => p.actualCompletion && p.plannedIdx !== p.x)
      .map((p) => ({
        row: p.row,
        from: p.plannedIdx,
        to: p.x,
        color: p.x > p.plannedIdx ? "var(--destructive)" : "var(--muted-foreground)",
      }));

    const rows = Array.from(rowSet).sort();
    const todayIdx = toIdx(today);
    const xs = [...points.map((p) => p.x), ...points.map((p) => p.plannedIdx), todayIdx];
    const minIdx = Math.min(...xs);
    const maxIdx = Math.max(...xs);

    // Month-boundary ticks for the calendar header row above the main axis.
    const monthTicks: MonthTick[] = [];
    const firstOfRange = new Date(base + minIdx * 86_400_000);
    let cursor = new Date(Date.UTC(firstOfRange.getUTCFullYear(), firstOfRange.getUTCMonth(), 1));
    const rangeEndMs = base + maxIdx * 86_400_000;
    while (cursor.getTime() <= rangeEndMs) {
      const idx = Math.round((cursor.getTime() - base) / 86_400_000);
      if (idx >= minIdx - 1 && idx <= maxIdx + 1) {
        monthTicks.push({ idx, label: cursor.toLocaleDateString(undefined, { month: "long" }) });
      }
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return { points, slipBars, rows, minIdx, maxIdx, todayIdx, base, monthTicks };
  }, [batches]);

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No batches to plot.</p>;
  }

  const formatTick = (idx: number) =>
    new Date(base + idx * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: Math.max(240, rows.length * ROW_HEIGHT + 76) }}
      >
        <ScatterChart margin={{ left: 4, right: 16, top: 28, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.6} />
          {monthTicks.map((t) => (
            <ReferenceLine
              key={t.idx}
              x={t.idx}
              stroke="var(--border)"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            type="number"
            dataKey="x"
            domain={[minIdx - 1, maxIdx + 1]}
            tickFormatter={formatTick}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            type="category"
            dataKey="row"
            allowDuplicatedCategory={false}
            width={110}
            tickLine={false}
            axisLine={false}
            fontSize={11.5}
            tick={{ fill: "var(--foreground)", fontWeight: 500 }}
          />
          <ReferenceLine x={todayIdx} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          <MonthHeader ticks={monthTicks} />
          <SlipBars bars={slipBars} />
          <ChartTooltip content={<GanttTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter
            data={points}
            shape={(props) => {
              const { cx, cy, payload } = props as unknown as { cx?: number; cy?: number; payload?: Point };
              if (cx === undefined || cy === undefined || !payload) return <g />;
              return <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={payload.color} stroke="none" />;
            }}
          />
        </ScatterChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--muted-foreground)" }} />
          Planned / in progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
          Completed on time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--destructive)" }} />
          Behind schedule
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: "var(--destructive)", opacity: 0.85 }} />
          Days late (planned → actual)
        </span>
      </div>
    </div>
  );
}
