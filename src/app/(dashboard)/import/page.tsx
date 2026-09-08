import { Database } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ImportForm } from "@/components/import-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiConfigured } from "@/lib/api-client";
import {
  importSalesCommitments,
  importPlantCapacity,
  importDailyOutput,
  importPlanningCapacityMaster,
} from "./actions";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Database}
        title="API not configured"
        description="Set API_BASE_URL and INTERNAL_API_KEY to point this app at the resin-ops-api service."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Data Import</h1>
        <p className="text-sm text-muted-foreground">
          Phase 1 is file-import based — upload the monthly Sales Commitment, Plant Capacity and
          daily output files here. Plants are created automatically from Plant Code / Mfg. Plant
          values.
        </p>
      </div>
      <Tabs defaultValue="sales-commitment">
        <TabsList>
          <TabsTrigger value="sales-commitment">Sales Commitment</TabsTrigger>
          <TabsTrigger value="plant-capacity">Plant Capacity</TabsTrigger>
          <TabsTrigger value="daily-output">Daily Output</TabsTrigger>
          <TabsTrigger value="planning-capacity-master">Planning-Capacity Master</TabsTrigger>
        </TabsList>
        <TabsContent value="sales-commitment">
          <Card>
            <CardHeader>
              <CardTitle>Sales Commitment (Next Month)</CardTitle>
              <CardDescription>
                The demand-side input that drives the production plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportForm
                id="sales-commitment-file"
                label="Sales Commitment"
                action={importSalesCommitments}
                expectedColumns={[
                  "Sales Order Number",
                  "Sales Order Date",
                  "Required Date (optional — backfilled as order date + 21 days if omitted)",
                  "Salesperson Name",
                  "Customer Name",
                  "Container Dispatch Location (Plant-internal)",
                  "Item Code",
                  "Item Description",
                  "Sales Order Primary Balance Qty",
                  "Pallets Required",
                  "Sales Order Balance Value",
                  "SUB PU",
                  "Product Subgroup",
                  "Business Group",
                  "Mfg. Plant",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plant-capacity">
          <Card>
            <CardHeader>
              <CardTitle>Plant Capacity Master</CardTitle>
              <CardDescription>
                Source of truth for what can be produced, where, and how much. Column names are
                an Autonex-proposed template — confirm against Thermax&apos;s actual file before
                first real import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportForm
                id="plant-capacity-file"
                label="Plant Capacity"
                action={importPlantCapacity}
                expectedColumns={[
                  "Plant Code",
                  "Plant Name",
                  "Sub Product",
                  "Stream",
                  "Product",
                  "Monthly Capacity Qty",
                  "Effective Month",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="daily-output">
          <Card>
            <CardHeader>
              <CardTitle>Daily Output</CardTitle>
              <CardDescription>
                Actual production per plant, stream and day. Column names are an
                Autonex-proposed template — confirm against Thermax&apos;s actual file before
                first real import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportForm
                id="daily-output-file"
                label="Daily Output"
                action={importDailyOutput}
                expectedColumns={["Plant Code", "Stream", "Date", "Actual Qty"]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="planning-capacity-master">
          <Card>
            <CardHeader>
              <CardTitle>Planning-Capacity Master</CardTitle>
              <CardDescription>
                Thermax&apos;s real per-plant planning export (one sheet per plant, wide
                per-shift/per-day layout). There&apos;s no maximum-capacity column in this file,
                so it feeds the production plan and daily output (Plan vs Actual) rather than
                Capacity Utilization. Row 2 must hold the plant name, and row 4&apos;s first
                column must read &quot;&lt;Stream&gt; (Product Type)&quot; — sheets that don&apos;t
                match this shape are skipped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportForm
                id="planning-capacity-master-file"
                label="Planning-Capacity Master"
                action={importPlanningCapacityMaster}
                expectedColumns={[
                  "Row 2, col A: Plant name (e.g. \"Jhagadia Plant\")",
                  "Row 4, col A: \"<Stream> (Product Type)\" (e.g. \"Anion (Product Type)\")",
                  "Row 4: Stream, Product, Monthly Req, Prod Plan, Output, C/T",
                  "Row 3+4 onward: one (date, A shift, B shift, C shift) column group per day",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
