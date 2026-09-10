import type { DailyTrendPoint } from "@/lib/api-client";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// DEMO DATA — synthetic per-day completion % for days 1–9 of the current month.
// The real daily output is a flat ~83% every day, which can't show a gradient,
// so these hand-set values give the green→yellow→red spread for the demo.
// Remove this and colour from the real `data` once daily achievement varies.
const DEMO_PCT: Record<number, number> = {
  1: 94,
  2: 82,
  3: 63,
  4: 88,
  5: 97,
  6: 71,
  7: 90,
  8: 79,
  9: 60,
};

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

export function PlanAchievementHeatmap({ data }: { data: DailyTrendPoint[] }) {
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
    const pct = !isFuture && !isToday ? (DEMO_PCT[dayNum] ?? null) : null;
    return { dayNum, isFuture, isToday, pct };
  });

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
            <div
              key={cell.dayNum}
              className="group relative flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums"
              style={{
                backgroundColor: bg,
                color: cell.isToday || hasData ? "#ffffff" : "var(--muted-foreground)",
              }}
            >
              {cell.dayNum}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-normal text-popover-foreground shadow-md group-hover:block">
                {label}
              </span>
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
