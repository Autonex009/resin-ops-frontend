import type { DailyTrendPoint } from "@/lib/api-client";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Explicit semantic colors — the app theme is red/black and has no green token,
// but plan achievement genuinely needs a met / behind / no-data scale.
const GREEN = "#16a34a"; // met or beat the day's target
const RED = "#dc2626"; // produced, but below target
const BLUE = "#2563eb"; // today's ring
const pad = (n: number) => String(n).padStart(2, "0");

type DayState = "met" | "behind" | "none";

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

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    const isFuture = dateStr > today;
    const isToday = dateStr === today;
    const pct = pctByDay.get(dateStr);

    let state: DayState;
    if (isFuture || pct === undefined || pct === null) state = "none";
    else state = pct >= 100 ? "met" : "behind";

    return { dayNum, dateStr, isFuture, isToday, pct: pct ?? null, state };
  });

  const fillFor = (s: DayState) =>
    s === "met" ? GREEN : s === "behind" ? RED : "var(--muted)";

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
                backgroundColor: fillFor(cell.state),
                color: cell.state === "none" ? "var(--muted-foreground)" : "#ffffff",
                boxShadow: cell.isToday ? `inset 0 0 0 2px ${BLUE}` : undefined,
              }}
            >
              {cell.dayNum}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: GREEN }} /> Met plan
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: RED }} /> Behind
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--muted)" }} /> No data
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ boxShadow: `inset 0 0 0 2px ${BLUE}` }}
          />{" "}
          Today
        </span>
      </div>
    </div>
  );
}
