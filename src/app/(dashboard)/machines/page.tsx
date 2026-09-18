import {
  Activity,
  CircleCheck,
  Container,
  Droplets,
  Filter,
  Flame,
  Snowflake,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { MachineMonitorCard, type Machine } from "@/components/machine-monitor-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// DEMO DATA — no live telemetry/PLC integration exists yet, so this is a
// hand-set snapshot of the esterification -> blending line for the pitch.
// Wire this to a real `machines` table + status feed once that exists.
const MACHINES: Machine[] = [
  {
    id: "esterification-reactor",
    name: "Esterification Reactor",
    role: "Poly-condensation of glycol + anhydride under N₂",
    status: "running",
    metrics: [
      { label: "Temperature", value: "198°C", hint: "target ~200°C" },
      { label: "Acid Value", value: "12.4", hint: "target 10–15 mg KOH/g" },
      { label: "N₂ Purge", value: "4.2 L/min" },
    ],
  },
  {
    id: "blending-kettle",
    name: "Blending Kettle",
    role: "Cools the batch and blends in styrene monomer",
    status: "running",
    metrics: [
      { label: "Temperature", value: "101°C", hint: "target 100–102°C" },
      { label: "Viscosity", value: "850 cP" },
      { label: "Styrene Feed", value: "92%" },
    ],
  },
  {
    id: "partial-condenser",
    name: "Partial Condenser",
    role: "Condenses glycol back into the reactor",
    status: "running",
    metrics: [
      { label: "Outlet Temp", value: "84°C" },
      { label: "Glycol Reflux", value: "3.1 L/min" },
    ],
  },
  {
    id: "total-condenser",
    name: "Total Condenser",
    role: "Condenses off the reaction water",
    status: "running",
    metrics: [
      { label: "Outlet Temp", value: "42°C" },
      { label: "Condensate", value: "1.8 L/min" },
    ],
  },
  {
    id: "sparkler-filter-press",
    name: "Sparkler Filter Press",
    role: "Filters the batch before storage",
    status: "maintenance",
    metrics: [
      { label: "Differential Pressure", value: "—", hint: "offline" },
      { label: "Cake Cleared", value: "100%" },
    ],
  },
  {
    id: "storage-tank",
    name: "Storage Tank",
    role: "Holds filtered resin ready for dispatch",
    status: "idle",
    metrics: [
      { label: "Level", value: "34%" },
      { label: "Temperature", value: "28°C" },
    ],
  },
];

const MACHINE_ICONS: Record<string, LucideIcon> = {
  "esterification-reactor": Flame,
  "blending-kettle": Droplets,
  "partial-condenser": Wind,
  "total-condenser": Snowflake,
  "sparkler-filter-press": Filter,
  "storage-tank": Container,
};

export default function MachinesPage() {
  const running = MACHINES.filter((m) => m.status === "running").length;
  const idle = MACHINES.filter((m) => m.status === "idle").length;
  const attention = MACHINES.filter((m) => m.status === "maintenance" || m.status === "down").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Machine Monitors</h1>
        <p className="text-sm text-muted-foreground">
          Live status across the esterification and blending line.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Total Machines" value={String(MACHINES.length)} icon={Activity} />
        <KpiCard title="Running" value={String(running)} icon={CircleCheck} tone="success" />
        <KpiCard
          title="Needs Attention"
          value={String(attention)}
          subtext={idle > 0 ? `${idle} idle` : undefined}
          icon={Wrench}
          tone={attention > 0 ? "warning" : "default"}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Process Line</CardTitle>
          <CardDescription>
            Each machine in the esterification → blending flow, with its current status and key readings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {MACHINES.map((m) => (
            <MachineMonitorCard key={m.id} machine={m} icon={MACHINE_ICONS[m.id]} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
