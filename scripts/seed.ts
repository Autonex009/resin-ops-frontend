/**
 * Development seed for Resin Ops.
 *
 * Populates every table the dashboard reads so each page renders with data:
 * plants, plant capacities, sales commitments, stream production plans,
 * batches and daily outputs, plus the file_imports rows they hang off.
 *
 * The data is synthetic demo data (customers, order numbers and quantities are
 * invented); only the plant and the Tulsion grade names are real.
 *
 * The script is idempotent: it clears the rows it owns for DMP1 and reinserts
 * them, so re-running never duplicates. Dates are generated relative to the run
 * date — the previous month is complete, the current month runs up to today.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  batches,
  dailyOutputs,
  fileImports,
  plantCapacities,
  plants,
  productionPlans,
  salesCommitments,
} from "../src/db/schema";

type Stream = "cation" | "anion" | "mixed_bed";

const PLANT = { code: "DMP1", name: "Dahej" };

// Sub Product -> Stream -> Product, with max monthly capacity in MT.
const CAPACITY_LINES: {
  stream: Stream;
  subProduct: string;
  product: string;
  monthly: number;
}[] = [
  { stream: "cation", subProduct: "Strong Acid Cation (SAC)", product: "Tulsion T-42 (H)", monthly: 420 },
  { stream: "cation", subProduct: "Strong Acid Cation (SAC)", product: "Tulsion T-42 Na", monthly: 360 },
  { stream: "cation", subProduct: "Weak Acid Cation (WAC)", product: "Tulsion CXO-9", monthly: 140 },
  { stream: "anion", subProduct: "Strong Base Anion (SBA)", product: "Tulsion A-23 (Cl)", monthly: 300 },
  { stream: "anion", subProduct: "Strong Base Anion (SBA)", product: "Tulsion A-27 (OH)", monthly: 180 },
  { stream: "anion", subProduct: "Weak Base Anion (WBA)", product: "Tulsion A-30", monthly: 120 },
  { stream: "mixed_bed", subProduct: "Mixed Bed", product: "Tulsion MB-115", monthly: 160 },
  { stream: "mixed_bed", subProduct: "Mixed Bed", product: "Tulsion MB-108", monthly: 90 },
];

const STREAMS: Stream[] = ["cation", "anion", "mixed_bed"];

// Planned monthly qty per stream, a little under nameplate capacity.
const PLAN_BY_STREAM: Record<Stream, number> = {
  cation: 860,
  anion: 555,
  mixed_bed: 230,
};

const STREAM_TAG: Record<Stream, string> = {
  cation: "CAT",
  anion: "ANI",
  mixed_bed: "MB",
};

const COMMITMENTS = [
  { customer: "NTPC Ltd", dispatch: "Kudgi, Karnataka", item: "TUL-T42H-25", desc: "Tulsion T-42 (H) - 25 L bag", qty: 96, rate: 285000, group: "Power", subgroup: "SAC", sales: "R. Deshmukh" },
  { customer: "Tata Power Ltd", dispatch: "Trombay, Maharashtra", item: "TUL-A23CL-25", desc: "Tulsion A-23 (Cl) - 25 L bag", qty: 48, rate: 341000, group: "Power", subgroup: "SBA", sales: "R. Deshmukh" },
  { customer: "Reliance Industries Ltd", dispatch: "Jamnagar, Gujarat", item: "TUL-MB115-25", desc: "Tulsion MB-115 - 25 L bag", qty: 72, rate: 402000, group: "Refinery", subgroup: "Mixed Bed", sales: "A. Iyer" },
  { customer: "Indian Oil Corporation Ltd", dispatch: "Panipat, Haryana", item: "TUL-T42NA-25", desc: "Tulsion T-42 Na - 25 L bag", qty: 120, rate: 268000, group: "Refinery", subgroup: "SAC", sales: "A. Iyer" },
  { customer: "Thermax Water Solutions", dispatch: "Pune, Maharashtra", item: "TUL-A27OH-25", desc: "Tulsion A-27 (OH) - 25 L bag", qty: 60, rate: 358000, group: "Internal", subgroup: "SBA", sales: "S. Kulkarni" },
  { customer: "Vedanta Ltd", dispatch: "Jharsuguda, Odisha", item: "TUL-T42H-25", desc: "Tulsion T-42 (H) - 25 L bag", qty: 84, rate: 285000, group: "Metals", subgroup: "SAC", sales: "P. Nair" },
  { customer: "Grasim Industries Ltd", dispatch: "Nagda, Madhya Pradesh", item: "TUL-CXO9-25", desc: "Tulsion CXO-9 - 25 L bag", qty: 36, rate: 396000, group: "Chemicals", subgroup: "WAC", sales: "P. Nair" },
  { customer: "UPL Ltd", dispatch: "Ankleshwar, Gujarat", item: "TUL-A30-25", desc: "Tulsion A-30 - 25 L bag", qty: 44, rate: 312000, group: "Chemicals", subgroup: "WBA", sales: "S. Kulkarni" },
  { customer: "Deepak Nitrite Ltd", dispatch: "Nandesari, Gujarat", item: "TUL-MB108-25", desc: "Tulsion MB-108 - 25 L bag", qty: 30, rate: 388000, group: "Chemicals", subgroup: "Mixed Bed", sales: "A. Iyer" },
  { customer: "Bharat Petroleum Corporation Ltd", dispatch: "Kochi, Kerala", item: "TUL-A23CL-25", desc: "Tulsion A-23 (Cl) - 25 L bag", qty: 66, rate: 341000, group: "Refinery", subgroup: "SBA", sales: "P. Nair" },
  { customer: "Adani Power Ltd", dispatch: "Mundra, Gujarat", item: "TUL-T42NA-25", desc: "Tulsion T-42 Na - 25 L bag", qty: 108, rate: 268000, group: "Power", subgroup: "SAC", sales: "R. Deshmukh" },
  { customer: "JSW Steel Ltd", dispatch: "Vijayanagar, Karnataka", item: "TUL-T42H-25", desc: "Tulsion T-42 (H) - 25 L bag", qty: 52, rate: 285000, group: "Metals", subgroup: "SAC", sales: "S. Kulkarni" },
  { customer: "Nayara Energy Ltd", dispatch: "Vadinar, Gujarat", item: "TUL-MB115-25", desc: "Tulsion MB-115 - 25 L bag", qty: 40, rate: 402000, group: "Refinery", subgroup: "Mixed Bed", sales: "A. Iyer" },
  { customer: "Aarti Industries Ltd", dispatch: "Jhagadia, Gujarat", item: "TUL-A30-25", desc: "Tulsion A-30 - 25 L bag", qty: 28, rate: 312000, group: "Chemicals", subgroup: "WBA", sales: "P. Nair" },
];

/** Deterministic PRNG so repeated seeds produce the same numbers. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function monthStart(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

function daysInMonth(m: Date) {
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
}

function dayOf(m: Date, day: number) {
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), day));
}

const money = (n: number) => n.toFixed(2);

async function main() {
  const db = getDb();

  const prevMonth = monthStart(-1);
  const thisMonth = monthStart(0);
  const todayIso = iso(new Date());

  // --- Plant -------------------------------------------------------------
  await db.insert(plants).values([PLANT]).onConflictDoNothing();
  const [plant] = await db.select().from(plants).where(eq(plants.code, PLANT.code));
  if (!plant) throw new Error(`Plant ${PLANT.code} was not created.`);

  // --- Clear previously seeded rows (FK-safe order) ----------------------
  await db.delete(dailyOutputs).where(eq(dailyOutputs.plantId, plant.id));
  await db.delete(batches).where(eq(batches.plantId, plant.id));
  await db.delete(productionPlans).where(eq(productionPlans.plantId, plant.id));
  await db.delete(salesCommitments).where(eq(salesCommitments.mfgPlantId, plant.id));
  await db.delete(plantCapacities).where(eq(plantCapacities.plantId, plant.id));
  await db.delete(fileImports);

  // --- File imports the master data hangs off ----------------------------
  const importRows = await db
    .insert(fileImports)
    .values([
      {
        fileType: "plant_capacity" as const,
        fileName: `Plant_Capacity_Master_${iso(thisMonth).slice(0, 7)}.xlsx`,
        uploadedBy: "seed",
        rowCount: CAPACITY_LINES.length * 2,
      },
      {
        fileType: "sales_commitment" as const,
        fileName: `Sales_Commitment_${iso(thisMonth).slice(0, 7)}.xlsx`,
        uploadedBy: "seed",
        rowCount: COMMITMENTS.length,
      },
      {
        fileType: "daily_output" as const,
        fileName: `Daily_Output_${iso(thisMonth).slice(0, 7)}.xlsx`,
        uploadedBy: "seed",
        rowCount: 0,
      },
    ])
    .returning({ id: fileImports.id, fileType: fileImports.fileType });

  const importId = (type: "plant_capacity" | "sales_commitment" | "daily_output") =>
    importRows.find((r) => r.fileType === type)!.id;

  // --- Plant capacities: previous + current month ------------------------
  const capacityValues = [prevMonth, thisMonth].flatMap((m) =>
    CAPACITY_LINES.map((line) => ({
      plantId: plant.id,
      stream: line.stream,
      subProduct: line.subProduct,
      product: line.product,
      monthlyCapacityQty: money(line.monthly),
      effectiveMonth: iso(m),
      importId: importId("plant_capacity"),
    })),
  );
  await db.insert(plantCapacities).values(capacityValues);

  // --- Sales commitments -------------------------------------------------
  const commitRand = rng(101);
  const commitmentValues = COMMITMENTS.map((c, i) => ({
    salesOrderNumber: `SO-${iso(prevMonth).slice(0, 4)}-${String(4180 + i * 7).padStart(5, "0")}`,
    salesOrderDate: iso(dayOf(prevMonth, 1 + Math.floor(commitRand() * 26))),
    salespersonName: c.sales,
    customerName: c.customer,
    dispatchLocation: c.dispatch,
    itemCode: c.item,
    itemDescription: c.desc,
    balanceQty: money(c.qty),
    palletsRequired: money(Math.ceil(c.qty / 4)),
    balanceValue: money(c.qty * c.rate),
    subPu: "Ion Exchange Resins",
    productSubgroup: c.subgroup,
    businessGroup: c.group,
    mfgPlantId: plant.id,
    importId: importId("sales_commitment"),
  }));
  await db.insert(salesCommitments).values(commitmentValues);

  // --- Production plans: previous + current month ------------------------
  const planValues = [prevMonth, thisMonth].flatMap((m) =>
    STREAMS.map((stream) => ({
      plantId: plant.id,
      stream,
      planMonth: iso(m),
      plannedQty: money(PLAN_BY_STREAM[stream]),
    })),
  );
  await db.insert(productionPlans).values(planValues);

  // --- Batches: every third day per stream, both months ------------------
  const batchRand = rng(202);
  const batchValues: (typeof batches.$inferInsert)[] = [];

  for (const m of [prevMonth, thisMonth]) {
    const total = daysInMonth(m);
    const tag = iso(m).slice(2, 4) + iso(m).slice(5, 7);

    for (const stream of STREAMS) {
      const batchDays: number[] = [];
      for (let day = 3; day <= total; day += 3) batchDays.push(day);
      const perBatch = PLAN_BY_STREAM[stream] / batchDays.length;

      batchDays.forEach((day, idx) => {
        const plannedCompletion = iso(dayOf(m, day));
        const planned = perBatch * (0.9 + batchRand() * 0.2);
        const isPast = plannedCompletion < todayIso;
        const slipDays = isPast && batchRand() < 0.18 ? 1 + Math.floor(batchRand() * 3) : 0;

        let status: "planned" | "in_progress" | "completed" | "delayed" = "planned";
        let actualCompletion: string | null = null;
        let actualQty: string | null = null;

        if (isPast) {
          const done = dayOf(m, day);
          done.setUTCDate(done.getUTCDate() + slipDays);
          if (iso(done) > todayIso) {
            // Slipped past today and still open.
            status = "delayed";
          } else {
            status = slipDays > 0 ? "delayed" : "completed";
            actualCompletion = iso(done);
            actualQty = money(planned * (0.94 + batchRand() * 0.1));
          }
        } else if (plannedCompletion === todayIso) {
          status = "in_progress";
        }

        batchValues.push({
          batchNumber: `${PLANT.code}-${STREAM_TAG[stream]}-${tag}-${String(idx + 1).padStart(2, "0")}`,
          plantId: plant.id,
          stream,
          plannedQty: money(planned),
          actualQty,
          plannedCompletion,
          actualCompletion,
          status,
        });
      });
    }
  }
  await db.insert(batches).values(batchValues);

  // --- Daily outputs: full previous month, current month up to today -----
  const outputRand = rng(303);
  const outputValues: (typeof dailyOutputs.$inferInsert)[] = [];

  for (const m of [prevMonth, thisMonth]) {
    const total = daysInMonth(m);
    for (const stream of STREAMS) {
      const perDay = PLAN_BY_STREAM[stream] / total;
      for (let day = 1; day <= total; day++) {
        const outputDate = iso(dayOf(m, day));
        if (outputDate > todayIso) continue; // no actuals booked for the future
        // Roughly 1 day in 14 is a changeover/maintenance day with no output.
        const idle = outputRand() < 0.07;
        outputValues.push({
          plantId: plant.id,
          stream,
          outputDate,
          actualQty: money(idle ? 0 : perDay * (0.86 + outputRand() * 0.26)),
          importId: importId("daily_output"),
        });
      }
    }
  }
  await db.insert(dailyOutputs).values(outputValues);

  await db
    .update(fileImports)
    .set({ rowCount: outputValues.length })
    .where(eq(fileImports.id, importId("daily_output")));

  console.log(`Seeded plant ${PLANT.code} (${PLANT.name})`);
  console.log(`  file imports        ${importRows.length}`);
  console.log(`  plant capacities    ${capacityValues.length}`);
  console.log(`  sales commitments   ${commitmentValues.length}`);
  console.log(`  production plans    ${planValues.length}`);
  console.log(`  batches             ${batchValues.length}`);
  console.log(`  daily outputs       ${outputValues.length}`);
  console.log(
    `Months: ${iso(prevMonth).slice(0, 7)} (complete), ${iso(thisMonth).slice(0, 7)} (to ${todayIso})`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
