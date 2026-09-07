import { AlertTriangle, CheckCircle2, ClipboardList, Database, IndianRupee, Info } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { CommitmentsFilterBar } from "@/components/commitments-filter-bar";
import { DataPagination } from "@/components/data-pagination";
import { KpiCard } from "@/components/kpi-card";
import { SearchInput } from "@/components/search-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  getCommitments,
  getPlants,
  type Commitment,
  type CommitmentsSummary,
  type Plant,
} from "@/lib/api-client";
import { COMMITMENT_STATUSES } from "@/lib/filter-options";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function isShort(c: Commitment) {
  const today = new Date().toISOString().slice(0, 10);
  return Boolean(c.requiredDate) && c.requiredDate! < today && Number(c.balanceQty) > 0;
}

export default async function CommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    plant?: string;
    businessGroup?: string;
    status?: string;
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
  const businessGroup = sp.businessGroup ?? "all";
  const status = sp.status ?? "all";
  const search = sp.search?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));

  let rows: Commitment[] = [];
  let total = 0;
  let businessGroups: string[] = [];
  let plantsList: Plant[] = [];
  let summary: CommitmentsSummary = { total: 0, short: 0, onTrack: 0, totalBalanceValue: 0 };
  let error: unknown = null;

  try {
    const [commitmentsResult, plants] = await Promise.all([
      getCommitments({ plant, businessGroup, status, search, page, pageSize: PAGE_SIZE }),
      getPlants(),
    ]);
    rows = commitmentsResult.commitments;
    total = commitmentsResult.total;
    businessGroups = commitmentsResult.businessGroups;
    plantsList = plants;
    summary = commitmentsResult.summary;
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
  if (businessGroup !== "all") {
    chips.push({ key: "businessGroup", label: businessGroup });
  }
  if (status !== "all") {
    chips.push({
      key: "status",
      label: COMMITMENT_STATUSES.find((s) => s.value === status)?.label ?? status,
    });
  }
  if (search) {
    chips.push({ key: "search", label: `"${search}"` });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Commitments</h1>
        <p className="text-sm text-muted-foreground">
          Sales commitments imported from the monthly Sales Commitment file.
        </p>
      </div>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Commitments Short uses a provisional rule</AlertTitle>
        <AlertDescription>
          The Sales Commitment file has no confirmed required-delivery-date field, so Required
          Date is backfilled as order date + 21 days until Thermax confirms the real field or
          lead time. This KPI also only flags commitments already past that date with balance
          outstanding — it does not yet project risk from remaining capacity.
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Commitments" value={summary.total.toLocaleString()} icon={ClipboardList} />
        <KpiCard title="On Track" value={summary.onTrack.toLocaleString()} icon={CheckCircle2} />
        <KpiCard
          title="Short"
          value={summary.short.toLocaleString()}
          icon={AlertTriangle}
          tone={summary.short > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Balance Value"
          value={`₹${summary.totalBalanceValue.toLocaleString()}`}
          icon={IndianRupee}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CommitmentsFilterBar
          plants={plantsList}
          businessGroups={businessGroups}
          plant={plant}
          businessGroup={businessGroup}
          status={status}
        />
        <SearchInput placeholder="Search order # or customer..." />
      </div>
      <ActiveFilterChips chips={chips} />
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No commitments match these filters"
          description="Try widening the filters above, or import a Sales Commitment file from the Data Import page."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead className="text-right">Balance Qty</TableHead>
                    <TableHead className="text-right">Balance Value</TableHead>
                    <TableHead>Business Group</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.salesOrderNumber}</TableCell>
                      <TableCell>{c.salesOrderDate}</TableCell>
                      <TableCell>{c.requiredDate ?? "—"}</TableCell>
                      <TableCell>{c.customerName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{c.itemCode}</span>
                          {c.itemDescription && (
                            <span className="text-xs text-muted-foreground">
                              {c.itemDescription}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c.plant?.code ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(c.balanceQty).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.balanceValue ? Number(c.balanceValue).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>{c.businessGroup ?? "—"}</TableCell>
                      <TableCell>
                        {isShort(c) ? (
                          <Badge variant="destructive">Short</Badge>
                        ) : (
                          <Badge variant="outline">On track</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} commitment{total === 1 ? "" : "s"} · page {page} of{" "}
              {pageCount}
            </p>
            <DataPagination page={page} pageCount={pageCount} />
          </div>
        </>
      )}
    </div>
  );
}
