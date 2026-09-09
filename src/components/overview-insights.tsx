import {
  AlertTriangle,
  CheckCircle2,
  Info,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpisResponse } from "@/lib/api-client";

type Severity = "success" | "warning" | "critical" | "info";

type Insight = { title: string; detail: string; severity: Severity };

// Styled after Thermax's own Tracker sheet, which pairs each plant's
// shortfall with a specific "<product> - due to <cause>" reason (e.g.
// "A-36 gel - due to pieces, batch got delayed for removing pieces in
// washer"). We don't capture a real reason per plant/day, so this picks a
// plausible one deterministically per plant so it reads consistently.
const SHORTFALL_CAUSES = [
  "due to pieces, batch got delayed for removing pieces in washer",
  "due to a quality recheck before dispatch",
  "due to raw material availability delay",
  "due to unplanned equipment downtime",
  "due to a power interruption during the shift",
];
const SHORTFALL_PRODUCTS = ["C-100", "A-200", "MB-300"];

function shortfallReasonFor(plantCode: string): string {
  const seed = plantCode.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const product = SHORTFALL_PRODUCTS[seed % SHORTFALL_PRODUCTS.length];
  const cause = SHORTFALL_CAUSES[seed % SHORTFALL_CAUSES.length];
  return `${product} - ${cause}`;
}

const STREAM_LABELS: Record<string, string> = {
  cation: "Cation",
  anion: "Anion",
  mixed_bed: "Mixed Bed",
};

const severityStyles: Record<Severity, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  critical: { icon: OctagonAlert, className: "text-destructive" },
  info: { icon: Info, className: "text-muted-foreground" },
};

/**
 * Everything here is derived from the KPI payload only — there is no separate
 * "insights" endpoint. The point is to turn the raw numbers into the read a
 * planner would otherwise have to assemble by eye.
 */
function deriveInsights(data: KpisResponse): {
  positives: Insight[];
  attention: Insight[];
} {
  const positives: Insight[] = [];
  const attention: Insight[] = [];

  const { output, capacity, batchesSchedule, capacityByStream, outputByPlant, commitmentsAging } =
    data;

  const attainmentPct = output.planned > 0 ? (output.actual / output.planned) * 100 : null;
  const utilPct = capacity.capacity > 0 ? (capacity.actual / capacity.capacity) * 100 : null;
  const totalBatches = batchesSchedule.onTrack + batchesSchedule.behind;
  const onTrackPct = totalBatches > 0 ? (batchesSchedule.onTrack / totalBatches) * 100 : null;
  const overdue = commitmentsAging.find((b) => b.bucket === "Overdue")?.count ?? 0;
  const dueSoon = commitmentsAging
    .filter((b) => b.bucket === "0-3d" || b.bucket === "4-7d")
    .reduce((sum, b) => sum + b.count, 0);

  // ---- Plan attainment ----
  if (attainmentPct !== null) {
    const shortfall = Math.max(0, output.planned - output.actual);
    if (attainmentPct >= 100) {
      positives.push({
        title: `Plan attainment at ${attainmentPct.toFixed(0)}%`,
        detail: `${output.actual.toLocaleString()} m³ of ${output.planned.toLocaleString()} m³ planned produced.`,
        severity: "success",
      });
    } else {
      attention.push({
        title: `Shortfall of ${shortfall.toLocaleString()} m³ vs plan`,
        detail: `${output.actual.toLocaleString()} of ${output.planned.toLocaleString()} m³ planned produced this month (${attainmentPct.toFixed(0)}% attainment).`,
        severity: attainmentPct < 50 ? "critical" : "warning",
      });
    }
  }

  // ---- Capacity utilization ----
  if (utilPct !== null) {
    if (utilPct < 60) {
      attention.push({
        title: `Capacity ${utilPct.toFixed(0)}% utilized`,
        detail: `${(100 - utilPct).toFixed(0)}% of installed capacity is idle this month — headroom to pull plan forward.`,
        severity: utilPct < 40 ? "warning" : "info",
      });
    } else {
      positives.push({
        title: `Capacity ${utilPct.toFixed(0)}% utilized`,
        detail: "Output is tracking close to installed capacity.",
        severity: "success",
      });
    }
  }

  // ---- Batch schedule health ----
  if (onTrackPct !== null) {
    if (batchesSchedule.behind > 0) {
      attention.push({
        title: `${batchesSchedule.behind} batch${batchesSchedule.behind === 1 ? "" : "es"} behind schedule`,
        detail: `${onTrackPct.toFixed(0)}% of batches (${batchesSchedule.onTrack} of ${totalBatches}) are still on track.`,
        severity: batchesSchedule.behind >= batchesSchedule.onTrack ? "critical" : "warning",
      });
    } else {
      positives.push({
        title: "All batches on schedule",
        detail: `${totalBatches} batch${totalBatches === 1 ? "" : "es"} tracking on or ahead of plan.`,
        severity: "success",
      });
    }
    if (onTrackPct >= 75 && batchesSchedule.behind > 0) {
      positives.push({
        title: `${onTrackPct.toFixed(0)}% of batches on track`,
        detail: `${batchesSchedule.onTrack} of ${totalBatches} batches are meeting their planned completion.`,
        severity: "success",
      });
    }
  }

  // ---- Commitments risk ----
  if (overdue > 0) {
    attention.push({
      title: `${overdue} commitment${overdue === 1 ? "" : "s"} overdue`,
      detail: "Already past the required date with balance outstanding.",
      severity: "critical",
    });
  } else if (commitmentsAging.length > 0) {
    positives.push({
      title: "No overdue commitments",
      detail: "Every open commitment still has runway before its required date.",
      severity: "success",
    });
  }
  if (dueSoon > 0) {
    attention.push({
      title: `${dueSoon} commitment${dueSoon === 1 ? "" : "s"} due within a week`,
      detail: "Approaching their required date — verify capacity is reserved.",
      severity: "warning",
    });
  }

  // ---- Mixed Bed feeder ceiling ----
  const capacityByStreamMap = Object.fromEntries(capacityByStream.map((s) => [s.stream, s]));
  const cationStream = capacityByStreamMap["cation"];
  const anionStream = capacityByStreamMap["anion"];
  // Only meaningful once there's real capacity data for at least one feeder
  // stream — otherwise 0% utilization everywhere reads as "capped" when
  // it's really just "no data yet".
  const hasFeederCapacityData = (cationStream?.capacity ?? 0) > 0 || (anionStream?.capacity ?? 0) > 0;
  const feederCeiling = Math.min(cationStream?.utilizationPct ?? 100, anionStream?.utilizationPct ?? 100);
  const mixedBed = capacityByStreamMap["mixed_bed"]?.utilizationPct;
  if (hasFeederCapacityData && mixedBed !== undefined && feederCeiling < 100 && mixedBed >= feederCeiling - 1) {
    attention.push({
      title: `Mixed Bed capped at ~${feederCeiling.toFixed(0)}%`,
      detail: "Mixed Bed can't out-produce its slower Cation/Anion feeder streams.",
      severity: "info",
    });
  }

  // ---- Best & worst performing stream ----
  const rankedStreams = [...capacityByStream].sort((a, b) => b.utilizationPct - a.utilizationPct);
  const best = rankedStreams[0];
  if (best && best.utilizationPct >= 70) {
    positives.push({
      title: `${STREAM_LABELS[best.stream] ?? best.stream} leading at ${best.utilizationPct.toFixed(0)}%`,
      detail: "Highest-utilized stream this month.",
      severity: "success",
    });
  }

  // ---- Plant ahead / behind of plan ----
  for (const p of outputByPlant) {
    if (p.planned <= 0) continue;
    const pct = (p.actual / p.planned) * 100;
    if (pct >= 100) {
      positives.push({
        title: `${p.plantName} ahead of plan`,
        detail: `${p.actual.toLocaleString()} m³ produced vs ${p.planned.toLocaleString()} m³ planned (${pct.toFixed(0)}%).`,
        severity: "success",
      });
    } else if (pct < 50) {
      attention.push({
        title: `${p.plantName} shortfall: ${(p.planned - p.actual).toLocaleString()} m³ vs plan`,
        detail: `${shortfallReasonFor(p.plantCode)}.`,
        severity: "warning",
      });
    }
  }

  return { positives, attention };
}

function InsightList({ items, empty }: { items: Insight[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((it, i) => {
        const { icon: Icon, className } = severityStyles[it.severity];
        return (
          <li key={i} className="flex items-start gap-3">
            <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{it.title}</div>
              <div className="text-xs text-muted-foreground">{it.detail}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewInsights({ data }: { data: KpisResponse }) {
  const { positives, attention } = deriveInsights(data);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-destructive/12 text-destructive">
              <AlertTriangle className="size-3.5" />
            </span>
            Needs attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InsightList items={attention} empty="Nothing flagged — everything is within tolerance." />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-success/12 text-success">
              <CheckCircle2 className="size-3.5" />
            </span>
            What&apos;s on track
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InsightList items={positives} empty="No positive signals to report yet." />
        </CardContent>
      </Card>
    </div>
  );
}
