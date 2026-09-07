import { Database, Gauge, Package, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { CapacityFilterBar } from "@/components/capacity-filter-bar";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
            <KpiCard title="Total Capacity" value={totalCapacity.toLocaleString()} icon={Package} />
            <KpiCard title="Total Actual" value={totalActual.toLocaleString()} icon={TrendingUp} />
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plant</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead className="text-right">Capacity</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="w-[200px]">Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r) => {
                      const capacity = Number(r.capacity);
                      const actual = Number(r.actual);
                      const pct = capacity > 0 ? Math.min((actual / capacity) * 100, 100) : 0;
                      return (
                        <TableRow key={`${r.plant_id}-${r.stream}`}>
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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-2" />
                              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
