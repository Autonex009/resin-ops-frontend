"use client";

import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
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
const DOT_RADIUS_DIM = 4.5;
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

type SlipBar = { row: string; from: number; to: number; color: string; lateDays: number };
type MonthTick = { idx: number; label: string };
type RowSeverity = { row: string; behindCount: number; totalLateDays: number; maxLateDays: number };

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
        const right = Math.max(x1, x2);
        const width = Math.max(right - left, BAR_HEIGHT / 2);
        const late = bar.color === "var(--destructive)";
        return (
          <g key={i}>
            <rect
              x={left}
              y={y - BAR_HEIGHT / 2}
              width={width}
              height={BAR_HEIGHT}
              rx={BAR_HEIGHT / 2}
              fill={bar.color}
              opacity={0.85}
            />
            <text
              x={left + width + 6}
              y={y}
              dy={3.5}
              fontSize={10}
              fontWeight={600}
              fill={late ? "var(--destructive)" : "var(--muted-foreground)"}
            >
              {late ? "+" : "-"}
              {bar.lateDays}d
            </text>
          </g>
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
  const { points, slipBars, rows, minIdx, maxIdx, todayIdx, base, monthTicks, worst } = useMemo(() => {
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
        worst: null as RowSeverity | null,
      };
    }

    const allDates = [
      ...batches.flatMap((b) => [b.plannedCompletion, b.actualCompletion].filter((d): d is string => Boolean(d))),
      today,
    ];
    const base = Math.min(...allDates.map(dayMs));
    const toIdx = (d: string) => Math.round((dayMs(d) - base) / 86_400_000);
    const todayIdx = toIdx(today);

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
        lateDays: Math.abs(p.x - p.plannedIdx),
      }));

    // Severity per row drives both the sort order (worst first) and the
    // "most behind" callout. A batch still overdue with no actual date yet
    // has slipped todayIdx - plannedIdx days so far, not zero.
    const severity = new Map<string, RowSeverity>();
    for (const p of points) {
      if (!p.behind) continue;
      const lateDays = p.actualCompletion ? p.x - p.plannedIdx : todayIdx - p.plannedIdx;
      const entry = severity.get(p.row) ?? { row: p.row, behindCount: 0, totalLateDays: 0, maxLateDays: 0 };
      entry.behindCount += 1;
      entry.totalLateDays += lateDays;
      entry.maxLateDays = Math.max(entry.maxLateDays, lateDays);
      severity.set(p.row, entry);
    }

    // Worst-first ordering: rows with no behind batches keep a stable
    // alphabetical order after the flagged ones. `worst` is derived from
    // this SAME sorted list (rather than its own separate sort) so the
    // "most behind" callout can never disagree with which row lands on
    // top of the chart — two independent sorts over differently-ordered
    // source collections can break ties inconsistently.
    const sortedSeverity = Array.from(severity.values()).sort(
      (a, b) => b.totalLateDays - a.totalLateDays || b.behindCount - a.behindCount,
    );
    const otherRows = Array.from(rowSet)
      .filter((r) => !severity.has(r))
      .sort((a, b) => a.localeCompare(b));
    const rows = [...sortedSeverity.map((s) => s.row), ...otherRows];
    const worst = sortedSeverity[0] ?? null;

    // Recharts derives a category axis's visual row order from the order
    // rows are first encountered in the data array, not from a `domain`
    // prop or any external sort — confirmed empirically, since passing a
    // sorted `domain` alone left the row order unchanged. The first row
    // encountered ends up at the *bottom* of a vertical category axis, so
    // reverse `rows` (worst-first) before assigning encounter order —
    // that puts the worst row last-encountered, i.e. at the top.
    const rowOrder = new Map([...rows].reverse().map((r, i) => [r, i]));
    const orderedPoints = [...points].sort((a, b) => rowOrder.get(a.row)! - rowOrder.get(b.row)!);

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

    return { points: orderedPoints, slipBars, rows, minIdx, maxIdx, todayIdx, base, monthTicks, worst };
  }, [batches]);

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No batches to plot.</p>;
  }

  const formatTick = (idx: number) =>
    new Date(base + idx * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

  return (
    <div className="flex flex-col gap-3">
      {worst && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          <span>
            Most behind: <span className="font-semibold">{worst.row}</span> — {worst.behindCount} batch
            {worst.behindCount === 1 ? "" : "es"}, up to {worst.maxLateDays}d late
          </span>
        </div>
      )}
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
            domain={rows}
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
              // Fade out far-future "planned" batches so the chart isn't a
              // wall of identical dots — anything already active or flagged
              // stays at full strength.
              const dim = payload.status === "planned" && !payload.behind;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={dim ? DOT_RADIUS_DIM : DOT_RADIUS}
                  fill={payload.color}
                  opacity={dim ? 0.45 : 1}
                  stroke="none"
                />
              );
            }}
          />
        </ScatterChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full opacity-45" style={{ backgroundColor: "var(--muted-foreground)" }} />
          Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--muted-foreground)" }} />
          In progress
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
