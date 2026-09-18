import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MachineStatus = "running" | "idle" | "maintenance" | "down";
export type MachineMetric = { label: string; value: string; hint?: string };
export type Machine = {
  id: string;
  name: string;
  role: string;
  status: MachineStatus;
  metrics: MachineMetric[];
};

const STATUS_META: Record<MachineStatus, { label: string; dot: string; text: string; pulse?: boolean }> = {
  running: { label: "Running", dot: "bg-success", text: "text-success", pulse: true },
  idle: { label: "Idle", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
  maintenance: { label: "Maintenance", dot: "bg-warning", text: "text-warning" },
  down: { label: "Down", dot: "bg-destructive", text: "text-destructive" },
};

export function MachineMonitorCard({ machine, icon: Icon }: { machine: Machine; icon: LucideIcon }) {
  const meta = STATUS_META[machine.status];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </span>
          <div>
            <CardTitle className="text-sm font-semibold">{machine.name}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">{machine.role}</CardDescription>
          </div>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium", meta.text)}>
          <span className={cn("size-1.5 rounded-full", meta.dot, meta.pulse && "animate-pulse")} />
          {meta.label}
        </span>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {machine.metrics.map((m) => (
          <div key={m.label} className="rounded-md bg-muted/50 px-3 py-2">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {m.label}
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">{m.value}</div>
            {m.hint && <div className="text-[10px] text-muted-foreground">{m.hint}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
