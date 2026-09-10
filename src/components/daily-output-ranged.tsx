"use client";

import { useMemo, useState } from "react";
import { PlanVsActualChart } from "@/components/plan-vs-actual-chart";
import type { DailyRow } from "@/lib/api-client";

const dayOf = (row: DailyRow) => Number(row.day.slice(-2));
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Wraps the Daily Output chart with a day-range filter (from day X to day Y),
 * so a busy month can be narrowed to a window without leaving the page.
 */
export function DailyOutputRanged({ data }: { data: DailyRow[] }) {
  const days = useMemo(
    () => [...new Set(data.map(dayOf))].sort((a, b) => a - b),
    [data],
  );
  const min = days[0] ?? 1;
  const max = days[days.length - 1] ?? 31;

  const [from, setFrom] = useState(min);
  const [to, setTo] = useState(max);

  const filtered = useMemo(
    () => data.filter((r) => dayOf(r) >= from && dayOf(r) <= to),
    [data, from, to],
  );

  const selectClass =
    "rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">Days</span>
        <select
          aria-label="From day"
          value={from}
          onChange={(e) => {
            const v = Number(e.target.value);
            setFrom(v);
            if (v > to) setTo(v);
          }}
          className={selectClass}
        >
          {days.map((n) => (
            <option key={n} value={n}>
              {pad(n)}
            </option>
          ))}
        </select>
        <span>–</span>
        <select
          aria-label="To day"
          value={to}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTo(v);
            if (v < from) setFrom(v);
          }}
          className={selectClass}
        >
          {days.map((n) => (
            <option key={n} value={n}>
              {pad(n)}
            </option>
          ))}
        </select>
        {(from !== min || to !== max) && (
          <button
            type="button"
            onClick={() => {
              setFrom(min);
              setTo(max);
            }}
            className="text-primary hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <PlanVsActualChart data={filtered} />
    </div>
  );
}
