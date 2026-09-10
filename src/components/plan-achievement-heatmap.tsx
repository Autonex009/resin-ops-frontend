import type { DailyTrendPoint } from "@/lib/api-client";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Reuse the app's existing semantic tokens rather than introducing new
// colors: --success (met) and --destructive (behind) are already
// theme-aware across light/dark, and --ring is the app's established
// "highlighted element" token, used here for the today indicator.
const MET = "var(--success)";
const MET_FOREGROUND = "var(--success-foreground)";
const BEHIND = "var(--destructive)";
const TODAY_RING = "var(--ring)";
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

  const fillFor = (s: DayState) => (s === "met" ? MET : s === "behind" ? BEHIND : "var(--muted)");

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
                color:
                  cell.state === "none"
                    ? "var(--muted-foreground)"
                    : cell.state === "met"
                      ? MET_FOREGROUND
                      : "#ffffff",
                boxShadow: cell.isToday ? `inset 0 0 0 2px ${TODAY_RING}` : undefined,
              }}
            >
              {cell.dayNum}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MET }} /> Met plan
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BEHIND }} /> Behind
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--muted)" }} /> No data
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ boxShadow: `inset 0 0 0 2px ${TODAY_RING}` }}
          />{" "}
          Today
        </span>
      </div>
    </div>
  );
}
