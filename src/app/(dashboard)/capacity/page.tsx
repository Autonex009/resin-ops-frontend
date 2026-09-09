import { Database, Gauge, Package, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { CapacityFilterBar } from "@/components/capacity-filter-bar";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  isApiConfigured,
  describeApiError,
  getCapacity,
  getPlants,
  type CapacityRow,
  type Plant,
} from "@/lib/api-client";
import { STREAMS } from "@/lib/filter-options";

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

export default async function CapacityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; plant?: string; stream?: string }>;
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
  const month = sp.month ? `${sp.month}-01` : currentMonthStart();
  const plant = sp.plant ?? "all";
  const stream = sp.stream ?? "all";

  let rows: CapacityRow[] = [];
  let plantsList: Plant[] = [];
  let error: unknown = null;

  try {
    [rows, plantsList] = await Promise.all([getCapacity(month), getPlants()]);
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <EmptyState icon={Database} title="Couldn't load data" description={describeApiError(error)} />
    );
  }

  const filteredRows = rows.filter(
    (r) => (plant === "all" || r.plant_code === plant) && (stream === "all" || r.stream === stream),
  );

  const totalCapacity = filteredRows.reduce((sum, r) => sum + Number(r.capacity), 0);
  const totalActual = filteredRows.reduce((sum, r) => sum + Number(r.actual), 0);
  const utilizationPct = totalCapacity > 0 ? Math.round((totalActual / totalCapacity) * 100) : 0;

  const chips: FilterChip[] = [];
  if (plant !== "all") {
    const p = plantsList.find((pl) => pl.code === plant);
    chips.push({ key: "plant", label: p ? `${p.name} (${p.code})` : plant });
  }
  if (stream !== "all") {
    chips.push({ key: "stream", label: STREAMS.find((s) => s.value === stream)?.label ?? stream });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Capacity Utilization</h1>
        <p className="text-sm text-muted-foreground">
          Actual output vs maximum monthly capacity, per plant and stream.
        </p>
      </div>
      {rows.length === 0 ? (
        <>
          <CapacityFilterBar
            plants={plantsList}
            plant={plant}
            stream={stream}
            month={month.slice(0, 7)}
          />
          <EmptyState
            icon={Gauge}
            title="No capacity data for this month"
            description="Import a Plant Capacity file with an Effective Month matching the selected period."
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard title="Total Capacity" value={`${totalCapacity.toLocaleString()} m³`} icon={Package} />
            <KpiCard title="Total Actual" value={`${totalActual.toLocaleString()} m³`} icon={TrendingUp} />
            <KpiCard
              title="Overall Utilization"
              value={`${utilizationPct}%`}
              icon={Gauge}
              tone={utilizationPct < 70 ? "warning" : "default"}
            />
          </div>
          <CapacityFilterBar
            plants={plantsList}
            plant={plant}
            stream={stream}
            month={month.slice(0, 7)}
          />
          <ActiveFilterChips chips={chips} />
          {filteredRows.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No capacity data matches these filters"
              description="Try widening the plant or stream filter above."
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Utilization by plant &amp; stream</CardTitle>
                  <CardDescription>
                    Each bar is actual output as a share of that stream&apos;s maximum monthly capacity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {filteredRows.map((r) => {
                    const capacity = Number(r.capacity);
                    const actual = Number(r.actual);
                    const pct = capacity > 0 ? Math.min((actual / capacity) * 100, 100) : 0;
                    const isMixedBed = r.stream === "mixed_bed";
                    return (
                      <div
                        key={`${r.plant_id}-${r.stream}`}
                        className="grid grid-cols-[minmax(120px,1fr)_90px_2fr_44px] items-center gap-3"
                      >
                        <span className="truncate text-sm text-foreground">
                          {r.plant_name} ({r.plant_code})
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {STREAM_LABELS[r.stream] ?? r.stream}
                        </span>
                        <div className="relative h-4 overflow-hidden rounded-md bg-muted">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-md ${isMixedBed ? "bg-warning" : "bg-primary"}`}
                            style={{ width: `${Math.max(pct, 1.5)}%` }}
                          />
                        </div>
                        <span className="text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-[3px] bg-primary" /> Cation / Anion
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-[3px] bg-warning" /> Mixed Bed (feeder-constrained)
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Underlying figures</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plant</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead className="text-right">Capacity (m³)</TableHead>
                        <TableHead className="text-right">Actual (m³)</TableHead>
                        <TableHead className="text-right">Utilization</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((r) => {
                        const capacity = Number(r.capacity);
                        const actual = Number(r.actual);
                        const pct = capacity > 0 ? Math.min((actual / capacity) * 100, 100) : 0;
                        return (
                          <TableRow key={`${r.plant_id}-${r.stream}-row`}>
                            <TableCell>
                              {r.plant_name} ({r.plant_code})
                            </TableCell>
                            <TableCell>{STREAM_LABELS[r.stream] ?? r.stream}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {capacity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {actual.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold tabular-nums">
                              {pct.toFixed(0)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
