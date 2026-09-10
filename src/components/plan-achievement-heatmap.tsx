import type { DailyTrendPoint } from "@/lib/api-client";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Green -> yellow -> red gradient for plan achievement (the requested
// conditional-format look). The red/black theme has no green/yellow tokens, so
// these are explicit data-encoding colors: higher % of the day's target pace
// reads greener, lower reads redder.
const NO_DATA = "var(--muted)";
const TODAY = "#374151"; // current day — dark grey
const pad = (n: number) => String(n).padStart(2, "0");

// t in [0,1] -> hue 0 (red) .. 60 (yellow) .. 120 (green)
const heatColor = (t: number) =>
  `hsl(${Math.round(Math.max(0, Math.min(1, t)) * 120)}, 70%, 45%)`;
const GRADIENT = "linear-gradient(to right, hsl(0,70%,45%), hsl(60,70%,45%), hsl(120,70%,45%))";

type Cell = {
  dayNum: number;
  dateStr: string;
  isFuture: boolean;
  isToday: boolean;
  pct: number | null;
};

export function PlanAchievementHeatmap({ data }: { data: DailyTrendPoint[] }) {
  if (data.length === 0) return null;

  // dailyTrend is cumulative, so each day's own output/target is the delta from
  // the previous day. pct = that day's actual as a share of its target pace.
  const pctByDay = new Map<string, number | null>();
  let prevActual = 0;
  let prevTarget = 0;
  for (const p of data) {
    const dayActual = p.actual - prevActual;
    const dayTarget = p.target - prevTarget;
    prevActual = p.actual;
    prevTarget = p.target;
    pctByDay.set(p.day, dayTarget > 0 ? (dayActual / dayTarget) * 100 : null);
  }

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
    const raw = pctByDay.get(dateStr);
    const pct = isFuture || raw === undefined || raw === null ? null : raw;
    return { dayNum, dateStr, isFuture, isToday: dateStr === today, pct };
  });

  // Normalize colors across the days that have data, so the gradient reads like
  // a conditional-format heatmap (best days green, worst red, middle yellow).
  const observed = cells.map((c) => c.pct).filter((v): v is number => v !== null);
  const lo = observed.length ? Math.min(...observed) : 0;
  const hi = observed.length ? Math.max(...observed) : 0;
  const norm = (pct: number) => (hi > lo ? (pct - lo) / (hi - lo) : 1);

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
          const bg = cell.isToday
            ? TODAY
            : hasData
              ? heatColor(norm(cell.pct as number))
              : NO_DATA;
          const title =
            cell.pct === null
              ? cell.isFuture
                ? `${cell.dateStr}: upcoming`
                : `${cell.dateStr}: no plan/output`
              : `${cell.dateStr}: ${Math.round(cell.pct)}% of daily plan`;
          return (
            <div
              key={cell.dateStr}
              title={title}
              className="flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums"
              style={{
                backgroundColor: bg,
                color: cell.isToday || hasData ? "#ffffff" : "var(--muted-foreground)",
              }}
            >
              {cell.dayNum}
            </div>
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
    </div>
  );
}
