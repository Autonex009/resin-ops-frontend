import { Database, Factory, Gauge, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { PlanFilterBar } from "@/components/plan-filter-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyOutputRanged } from "@/components/daily-output-ranged";
import { PlanVsActualCumulativeChart } from "@/components/plan-vs-actual-cumulative-chart";
import {
  isApiConfigured,
  describeApiError,
  getPlants,
  getPlanVsActual,
  type Plant,
  type DailyRow,
} from "@/lib/api-client";

export const dynamic = "force-dynamic";

const STREAM_LABELS: Record<string, string> = {
  cation: "Cation",
  anion: "Anion",
  mixed_bed: "Mixed Bed",
};

function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export default async function PlanVsActualPage({
  searchParams,
}: {
  searchParams: Promise<{ plant?: string; stream?: string; month?: string }>;
}) {
  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Database}
        title="API not configured"
        description="Set API_BASE_URL and INTERNAL_API_KEY to point this app at the resin-ops-api service."
      />
    );
  }

  const sp = await searchParams;

  let plantsList: Plant[] = [];
  let rows: DailyRow[] = [];
  const plantCode = sp.plant ?? "all";
  const stream = sp.stream ?? "all";
  const month = sp.month ? `${sp.month}-01` : currentMonthStart();
  let error: unknown = null;

  try {
    plantsList = await getPlants();

    if (plantsList.length > 0) {
      rows = await getPlanVsActual({ plant: plantCode, stream, month });
    }
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <EmptyState icon={Database} title="Couldn't load data" description={describeApiError(error)} />
    );
  }

  if (plantsList.length === 0) {
    return (
      <EmptyState
        icon={Factory}
        title="No plants yet"
        description="Import a Sales Commitment or Plant Capacity file first — plants are created automatically from those imports."
      />
    );
  }

  const totalPlanned = rows.reduce((sum, r) => sum + Number(r.planned), 0);
  const totalActual = rows.reduce((sum, r) => sum + Number(r.actual), 0);
  const variance = totalActual - totalPlanned;
  const attainmentPct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Plan vs Actual</h1>
        <p className="text-sm text-muted-foreground">
          Day-by-day planned vs actual output for the selected plant, stream and month. Zero days are visual, not hidden.
        </p>
      </div>
      <PlanFilterBar
        plants={plantsList}
        plant={plantCode}
        stream={stream}
        month={month.slice(0, 7)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Planned (month)" value={`${totalPlanned.toLocaleString()} m³`} icon={TrendingUp} />
        <KpiCard title="Actual (month)" value={`${totalActual.toLocaleString()} m³`} icon={TrendingUp} />
        <KpiCard
          title="Variance"
          value={`${variance > 0 ? "+" : ""}${variance.toLocaleString()} m³`}
          icon={TrendingUp}
          tone={variance < 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Attainment"
          value={`${attainmentPct}%`}
          icon={Gauge}
          tone={attainmentPct < 100 ? "warning" : "default"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Output</CardTitle>
            <CardDescription>
              {plantCode === "all" ? "All plants" : plantCode} ·{" "}
              {stream === "all" ? "All streams" : (STREAM_LABELS[stream] ?? stream)} — planned vs
              actual per day. Zero days are visual, not hidden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyOutputRanged data={rows} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Output</CardTitle>
            <CardDescription>
              Running month-to-date total — how far actual has drifted from the planned pace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanVsActualCumulativeChart data={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
