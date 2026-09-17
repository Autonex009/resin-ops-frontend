"use client";

import { useState } from "react";
import type { DailyTrendPoint } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STREAM_LABELS = { cation: "Cation", anion: "Anion", mixed_bed: "Mixed Bed" } as const;

type StreamKey = keyof typeof STREAM_LABELS;
type StreamFigure = { actual: number; target: number };
type DayDetail = { actual: number; target: number; streams: Record<StreamKey, StreamFigure> };

// DEMO DATA — synthetic per-day completion % (and the per-stream breakdown
// behind it), hand-set for days 1–16 of the current month. Real daily output
// is a flat ~83% every day, which can't show a gradient or a meaningful
// drill-down, so these numbers stand in for the pitch. Remove this and the
// generator below, deriving both the day % and the breakdown from the real
// `data`/per-stream output, once daily achievement actually varies.
const DEMO_DETAIL: Record<number, DayDetail> = {
  1: { actual: 65.7, target: 70, streams: { cation: { actual: 26.9, target: 28 }, anion: { actual: 22.8, target: 24 }, mixed_bed: { actual: 16.0, target: 18 } } },
  2: { actual: 57.0, target: 70, streams: { cation: { actual: 23.8, target: 28 }, anion: { actual: 19.2, target: 24 }, mixed_bed: { actual: 14.0, target: 18 } } },
  3: { actual: 44.1, target: 70, streams: { cation: { actual: 16.2, target: 28 }, anion: { actual: 15.6, target: 24 }, mixed_bed: { actual: 12.2, target: 18 } } },
  4: { actual: 61.4, target: 70, streams: { cation: { actual: 25.2, target: 28 }, anion: { actual: 20.9, target: 24 }, mixed_bed: { actual: 15.3, target: 18 } } },
  5: { actual: 67.9, target: 70, streams: { cation: { actual: 27.7, target: 28 }, anion: { actual: 23.0, target: 24 }, mixed_bed: { actual: 17.1, target: 18 } } },
  6: { actual: 49.8, target: 70, streams: { cation: { actual: 19.0, target: 28 }, anion: { actual: 17.8, target: 24 }, mixed_bed: { actual: 13.0, target: 18 } } },
  7: { actual: 62.9, target: 70, streams: { cation: { actual: 26.0, target: 28 }, anion: { actual: 21.4, target: 24 }, mixed_bed: { actual: 15.5, target: 18 } } },
  8: { actual: 55.1, target: 70, streams: { cation: { actual: 23.0, target: 28 }, anion: { actual: 18.5, target: 24 }, mixed_bed: { actual: 13.7, target: 18 } } },
  9: { actual: 42.0, target: 70, streams: { cation: { actual: 15.4, target: 28 }, anion: { actual: 14.9, target: 24 }, mixed_bed: { actual: 11.7, target: 18 } } },
  10: { actual: 59.6, target: 70, streams: { cation: { actual: 24.6, target: 28 }, anion: { actual: 20.2, target: 24 }, mixed_bed: { actual: 14.8, target: 18 } } },
  11: { actual: 50.4, target: 70, streams: { cation: { actual: 21.0, target: 28 }, anion: { actual: 16.8, target: 24 }, mixed_bed: { actual: 12.6, target: 18 } } },
  12: { actual: 63.4, target: 70, streams: { cation: { actual: 26.0, target: 28 }, anion: { actual: 21.6, target: 24 }, mixed_bed: { actual: 15.8, target: 18 } } },
  13: { actual: 47.6, target: 70, streams: { cation: { actual: 18.2, target: 28 }, anion: { actual: 16.8, target: 24 }, mixed_bed: { actual: 12.6, target: 18 } } },
  14: { actual: 67.1, target: 70, streams: { cation: { actual: 27.4, target: 28 }, anion: { actual: 22.8, target: 24 }, mixed_bed: { actual: 16.9, target: 18 } } },
  15: { actual: 56.0, target: 70, streams: { cation: { actual: 23.0, target: 28 }, anion: { actual: 19.0, target: 24 }, mixed_bed: { actual: 14.0, target: 18 } } },
  16: { actual: 61.5, target: 70, streams: { cation: { actual: 25.8, target: 28 }, anion: { actual: 20.6, target: 24 }, mixed_bed: { actual: 15.1, target: 18 } } },
};

const STREAM_TARGETS: Record<StreamKey, number> = { cation: 28, anion: 24, mixed_bed: 18 };

// Deterministic pseudo-random in [0, 1) from an integer seed — same seed
// always produces the same value, so a day's generated figures never change
// across re-renders (no Math.random()/Date.now(), which would).
function hash01(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Fallback for any elapsed day past the hand-authored DEMO_DETAIL table, so
// the calendar keeps filling in on its own as the pitch runs past day 16
// without needing another manual edit here.
function generatedDetail(day: number): DayDetail {
  const base = 58 + hash01(day * 3.7) * 40; // day-level center, 58-98
  const keys = Object.keys(STREAM_TARGETS) as StreamKey[];
  const streams = {} as Record<StreamKey, StreamFigure>;
  keys.forEach((key, i) => {
    const jitter = (hash01(day * 13.1 + i * 7.9) - 0.5) * 24; // ±12
    const pct = Math.max(15, Math.min(105, base + jitter));
    const target = STREAM_TARGETS[key];
    streams[key] = { actual: Math.round(target * (pct / 100) * 10) / 10, target };
  });
  const target = keys.reduce((sum, k) => sum + STREAM_TARGETS[k], 0);
  const actual = Math.round(keys.reduce((sum, k) => sum + streams[k].actual, 0) * 10) / 10;
  return { actual, target, streams };
}

function detailFor(day: number): DayDetail {
  return DEMO_DETAIL[day] ?? generatedDetail(day);
}

const NO_DATA = "var(--muted)";
const TODAY = "#374151"; // current day — dark grey
const pad = (n: number) => String(n).padStart(2, "0");

// Absolute scale: <=60% red, ~80% yellow, 100% green. A given % always maps to
// the same colour, regardless of the other days.
const heatColor = (pct: number) => {
  const t = Math.max(0, Math.min(1, (pct - 60) / 40));
  return `hsl(${Math.round(t * 120)}, 70%, 45%)`;
};
const GRADIENT = "linear-gradient(to right, hsl(0,70%,45%), hsl(60,70%,45%), hsl(120,70%,45%))";

type Cell = {
  dayNum: number;
  isFuture: boolean;
  isToday: boolean;
  pct: number | null;
};

function pctOf(f: StreamFigure) {
  return f.target > 0 ? Math.round((f.actual / f.target) * 100) : 0;
}

export function PlanAchievementHeatmap({ data }: { data: DailyTrendPoint[] }) {
  const [openDay, setOpenDay] = useState<number | null>(null);

  if (data.length === 0) return null;

  const first = new Date(`${data[0].day}T00:00:00Z`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const today = new Date().toISOString().slice(0, 10);

  const cells: Cell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    const isFuture = dateStr > today;
    const isToday = dateStr === today;
    const pct = !isFuture && !isToday ? pctOf(detailFor(dayNum)) : null;
    return { dayNum, isFuture, isToday, pct };
  });

  const detail = openDay !== null ? detailFor(openDay) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground">
            {label}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {cells.map((cell) => {
          const hasData = cell.pct !== null;
          const bg = cell.isToday ? TODAY : hasData ? heatColor(cell.pct as number) : NO_DATA;
          const label =
            cell.pct !== null
              ? `${MONTHS[month]} ${cell.dayNum} · ${Math.round(cell.pct)}% of plan`
              : cell.isToday
                ? `${MONTHS[month]} ${cell.dayNum} · today`
                : cell.isFuture
                  ? `${MONTHS[month]} ${cell.dayNum} · upcoming`
                  : `${MONTHS[month]} ${cell.dayNum} · no data`;
          return (
            <button
              key={cell.dayNum}
              type="button"
              disabled={!hasData}
              onClick={() => setOpenDay(cell.dayNum)}
              className="group relative flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums enabled:cursor-pointer enabled:transition-transform enabled:hover:scale-[1.06] disabled:cursor-default"
              style={{
                backgroundColor: bg,
                color: cell.isToday || hasData ? "#ffffff" : "var(--muted-foreground)",
              }}
            >
              {cell.dayNum}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-normal text-popover-foreground shadow-md group-hover:block">
                {label}
                {hasData && <span className="ml-1 text-muted-foreground">· click for detail</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Behind
          <span className="h-2.5 w-16 rounded-sm" style={{ background: GRADIENT }} />
          Met plan
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NO_DATA }} /> No data
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TODAY }} /> Today
        </span>
      </div>

      <Dialog open={openDay !== null} onOpenChange={(open) => !open && setOpenDay(null)}>
        <DialogContent>
          {openDay !== null && detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {MONTHS[month]} {openDay}
                </DialogTitle>
                <DialogDescription>
                  {detail.actual.toLocaleString()} of {detail.target.toLocaleString()} m³ produced —{" "}
                  {pctOf(detail)}% of that day&apos;s target pace.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                {(Object.keys(STREAM_LABELS) as StreamKey[]).map((key) => {
                  const s = detail.streams[key];
                  const pct = pctOf(s);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        {STREAM_LABELS[key]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: heatColor(pct) }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-xs tabular-nums text-foreground">
                        {s.actual.toLocaleString()} / {s.target.toLocaleString()} m³
                      </span>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums font-medium text-foreground">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
