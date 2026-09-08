import { AlertTriangle, CheckCircle2, Database, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { BatchesFilterBar } from "@/components/batches-filter-bar";
import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { DataPagination } from "@/components/data-pagination";
import { KpiCard } from "@/components/kpi-card";
import { SearchInput } from "@/components/search-input";
import {
  BatchDistributionChart,
  type DistributionSlice,
} from "@/components/batch-distribution-chart";
import { Badge } from "@/components/ui/badge";
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
  getBatches,
  getPlants,
  type Batch,
  type BatchesSummary,
  type Plant,
} from "@/lib/api-client";
import { BATCH_SCHEDULES, BATCH_STATUSES, STREAMS } from "@/lib/filter-options";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STREAM_LABELS: Record<string, string> = {
  cation: "Cation",
  anion: "Anion",
  mixed_bed: "Mixed Bed",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planned: "outline",
  in_progress: "secondary",
  completed: "default",
  delayed: "destructive",
};

function isBehindSchedule(plannedCompletion: string, actualCompletion: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (actualCompletion) return actualCompletion > plannedCompletion;
  return plannedCompletion < today;
}

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    plant?: string;
    stream?: string;
    status?: string;
    schedule?: string;
    search?: string;
    page?: string;
  }>;
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
  const plant = sp.plant ?? "all";
  const stream = sp.stream ?? "all";
  const status = sp.status ?? "all";
  const schedule = sp.schedule ?? "all";
  const search = sp.search?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));

  let rows: Batch[] = [];
  let allRows: Batch[] = [];
  let total = 0;
  let plantsList: Plant[] = [];
  let summary: BatchesSummary = { total: 0, behind: 0, onTrack: 0 };
  let error: unknown = null;

  try {
    const [batchesResult, allBatchesResult, plants] = await Promise.all([
      getBatches({ plant, stream, status, schedule, search, page, pageSize: PAGE_SIZE }),
      getBatches({ plant, stream, status, schedule, search, page: 1, pageSize: 500 }),
      getPlants(),
    ]);
    rows = batchesResult.batches;
    allRows = allBatchesResult.batches;
    total = batchesResult.total;
    plantsList = plants;
    summary = batchesResult.summary;
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <EmptyState icon={Database} title="Couldn't load data" description={describeApiError(error)} />
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chips: FilterChip[] = [];
  if (plant !== "all") {
    const p = plantsList.find((pl) => pl.code === plant);
    chips.push({ key: "plant", label: p ? `${p.name} (${p.code})` : plant });
  }
  if (stream !== "all") {
    chips.push({ key: "stream", label: STREAMS.find((s) => s.value === stream)?.label ?? stream });
  }
  if (status !== "all") {
    chips.push({ key: "status", label: BATCH_STATUSES.find((s) => s.value === status)?.label ?? status });
  }
  if (schedule !== "all") {
    chips.push({
      key: "schedule",
      label: BATCH_SCHEDULES.find((s) => s.value === schedule)?.label ?? schedule,
    });
  }
  if (search) {
    chips.push({ key: "search", label: `"${search}"` });
  }

  // ---- Derived data for the distribution donut and roadmap ----
  const STATUS_META: Record<string, { label: string; color: string }> = {
    planned: { label: "Planned", color: "var(--chart-1)" },
    in_progress: { label: "In Progress", color: "var(--chart-3)" },
    completed: { label: "Completed", color: "var(--chart-2)" },
    delayed: { label: "Delayed", color: "var(--destructive)" },
  };

  const statusCounts = allRows.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const byStatus: DistributionSlice[] = Object.keys(STATUS_META)
    .filter((k) => statusCounts[k])
    .map((k) => ({ name: STATUS_META[k].label, value: statusCounts[k], color: STATUS_META[k].color }));

  const behindCount = allRows.filter((b) => isBehindSchedule(b.plannedCompletion, b.actualCompletion)).length;
  const bySchedule: DistributionSlice[] = [
    { name: "On track", value: allRows.length - behindCount, color: "var(--chart-2)" },
    { name: "Behind", value: behindCount, color: "var(--destructive)" },
  ];

  const roadmap = allRows
    .filter((b) => b.status === "planned" || b.status === "in_progress")
    .sort((a, b) => a.plannedCompletion.localeCompare(b.plannedCompletion))
    .slice(0, 6);

  const hasCharts = allRows.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Batches</h1>
        <p className="text-sm text-muted-foreground">
          Batch schedule across all plants and streams. A batch is flagged behind schedule once
          it&apos;s more than half a day past its planned completion.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Total Batches" value={summary.total.toLocaleString()} icon={ListChecks} />
        <KpiCard
          title="On Track"
          value={summary.onTrack.toLocaleString()}
          icon={CheckCircle2}
        />
        <KpiCard
          title="Behind Schedule"
          value={summary.behind.toLocaleString()}
          icon={AlertTriangle}
          tone={summary.behind > 0 ? "warning" : "default"}
        />
      </div>
      {hasCharts && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Batch Distribution</CardTitle>
              <CardDescription>
                How the current batch set splits by status and by schedule health.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatchDistributionChart byStatus={byStatus} bySchedule={bySchedule} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Batch Roadmap</CardTitle>
              <CardDescription>Upcoming and in-progress batches, by planned completion.</CardDescription>
            </CardHeader>
            <CardContent>
              {roadmap.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No upcoming or in-progress batches.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {roadmap.map((b) => {
                    const behind = isBehindSchedule(b.plannedCompletion, b.actualCompletion);
                    return (
                      <li key={b.id} className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${behind ? "bg-destructive" : "bg-primary"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-foreground">{b.batchNumber}</span>
                            <Badge variant={STATUS_VARIANT[b.status] ?? "outline"}>{b.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due {b.plannedCompletion} · {b.plant.code} ({STREAM_LABELS[b.stream] ?? b.stream})
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BatchesFilterBar
          plants={plantsList}
          plant={plant}
          stream={stream}
          status={status}
          schedule={schedule}
        />
        <SearchInput placeholder="Search batch #..." />
      </div>
      <ActiveFilterChips chips={chips} />
      {rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No batches match these filters"
          description="Try widening the filters above, or import batch schedule data if none exists yet."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead className="text-right">Planned Qty</TableHead>
                    <TableHead className="text-right">Actual Qty</TableHead>
                    <TableHead>Planned Completion</TableHead>
                    <TableHead>Actual Completion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => {
                    const behind = isBehindSchedule(b.plannedCompletion, b.actualCompletion);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                        <TableCell>{b.plant.code}</TableCell>
                        <TableCell>{STREAM_LABELS[b.stream] ?? b.stream}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(b.plannedQty).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.actualQty ? Number(b.actualQty).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>{b.plannedCompletion}</TableCell>
                        <TableCell>{b.actualCompletion ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[b.status] ?? "outline"}>{b.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {behind ? (
                            <Badge variant="destructive">Behind</Badge>
                          ) : (
                            <Badge variant="outline">On track</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} batch{total === 1 ? "" : "es"} · page {page} of {pageCount}
            </p>
            <DataPagination page={page} pageCount={pageCount} />
          </div>
        </>
      )}
    </div>
  );
}
