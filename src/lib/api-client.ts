export type Plant = { id: string; code: string; name: string };

export type DailyRow = { day: string; planned: string; actual: string };

export type CapacityRow = {
  plant_id: string;
  plant_code: string;
  plant_name: string;
  stream: string;
  capacity: string;
  actual: string;
};

export type Batch = {
  id: string;
  batchNumber: string;
  stream: string;
  plannedQty: string;
  actualQty: string | null;
  plannedCompletion: string;
  actualCompletion: string | null;
  status: string;
  plant: { code: string };
};

export type Commitment = {
  id: string;
  salesOrderNumber: string;
  salesOrderDate: string;
  requiredDate: string | null;
  customerName: string;
  itemCode: string;
  itemDescription: string | null;
  balanceQty: string;
  balanceValue: string | null;
  businessGroup: string | null;
  plant: { code: string } | null;
};

export type DailyTrendPoint = { day: string; actual: number; target: number };

export type StreamCapacityPoint = {
  stream: string;
  capacity: number;
  actual: number;
  utilizationPct: number;
};

export type PlantOutputPoint = { plantCode: string; plantName: string; actual: number; planned: number };

export type BatchScheduleSummary = { onTrack: number; behind: number };

export type AgingBucket = { bucket: string; count: number };

export type DueDateCount = { day: string; count: number };

export type PlantStreamCapacityRow = {
  plant_id: string;
  plant_code: string;
  plant_name: string;
  stream: string;
  capacity: string;
  actual: string;
};

export type KpisResponse = {
  output: { actual: number; planned: number; month: string };
  capacity: { actual: number; capacity: number; month: string };
  batchesBehind: number;
  commitmentsShort: number;
  dailyTrend: DailyTrendPoint[];
  capacityByStream: StreamCapacityPoint[];
  outputByPlant: PlantOutputPoint[];
  batchesSchedule: BatchScheduleSummary;
  commitmentsAging: AgingBucket[];
  batchDueDates: DueDateCount[];
  capacityByPlantAndStream: PlantStreamCapacityRow[];
};

export type ImportResult = { success: boolean; message: string };

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error("API_BASE_URL_NOT_CONFIGURED");
  return url.replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) throw new Error("INTERNAL_API_KEY_NOT_CONFIGURED");
  return key;
}

export function isApiConfigured(): boolean {
  return Boolean(process.env.API_BASE_URL && process.env.INTERNAL_API_KEY);
}

export function describeApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `API request failed: ${message}`;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { "x-internal-api-key": apiKey() },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API GET ${path} failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

async function apiPostFile(path: string, formData: FormData): Promise<ImportResult> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "x-internal-api-key": apiKey() },
    body: formData,
  });
  return res.json();
}

export function getKpis() {
  return apiGet<KpisResponse>("/api/kpis");
}

export function getPlants() {
  return apiGet<{ plants: Plant[] }>("/api/plants").then((r) => r.plants);
}

export function getPlanVsActual(params: { plant?: string; stream?: string; month: string }) {
  return apiGet<{ rows: DailyRow[] }>(`/api/plan-vs-actual${toSearchParams(params)}`).then((r) => r.rows);
}

export function getCapacity(month: string) {
  const search = new URLSearchParams({ month });
  return apiGet<{ rows: CapacityRow[] }>(`/api/capacity?${search}`).then((r) => r.rows);
}

export type BatchesParams = {
  plant?: string;
  stream?: string;
  status?: string;
  schedule?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type BatchesSummary = { total: number; behind: number; onTrack: number };

export type PaginatedBatches = {
  batches: Batch[];
  total: number;
  page: number;
  pageSize: number;
  summary: BatchesSummary;
};

function toSearchParams(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === "all") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getBatches(params: BatchesParams = {}) {
  return apiGet<PaginatedBatches>(`/api/batches${toSearchParams(params)}`);
}

export type CommitmentsParams = {
  plant?: string;
  businessGroup?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CommitmentsSummary = {
  total: number;
  short: number;
  onTrack: number;
  totalBalanceValue: number;
};

export type PaginatedCommitments = {
  commitments: Commitment[];
  total: number;
  page: number;
  pageSize: number;
  businessGroups: string[];
  summary: CommitmentsSummary;
};

export function getCommitments(params: CommitmentsParams = {}) {
  return apiGet<PaginatedCommitments>(`/api/commitments${toSearchParams(params)}`);
}

export function importSalesCommitments(formData: FormData) {
  return apiPostFile("/api/import/sales-commitments", formData);
}

export function importPlantCapacity(formData: FormData) {
  return apiPostFile("/api/import/plant-capacity", formData);
}

export function importDailyOutput(formData: FormData) {
  return apiPostFile("/api/import/daily-output", formData);
}

export function importPlanningCapacityMaster(formData: FormData) {
  return apiPostFile("/api/import/planning-capacity-master", formData);
}
