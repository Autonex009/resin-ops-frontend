"use client";

import { useEffect, useId, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Streams and temps are tagged with the equipment stage they belong to, so
// their accent color reads as a status: green = running healthy (reactor,
// filter), amber = running but flagged for attention (heater), red = fault
// / offline (standby).
type Stage = "reactor" | "heater" | "filter" | "standby";
type Row = { label: string; base: number; trace?: boolean };
type StreamBox = { id: string; title: string; x: number; y: number; w: number; stage: Stage; rows: Row[] };
type TempBadge = { id: string; base: number; x: number; y: number; stage: Stage };
type EquipmentId = "R1" | "H1" | "F1" | "H1B";
type EquipmentInfo = { id: EquipmentId; name: string; role: string; x: number; y: number; w: number; h: number };
type Metric = { label: string; value: string; tone?: "destructive" | "warning" };

const VB_W = 1000;
const VB_H = 620;

const HEALTHY_GREEN = "#16a34a";
const STAGE_VAR: Record<Stage, string> = {
  reactor: HEALTHY_GREEN,
  heater: "var(--warning)",
  filter: HEALTHY_GREEN,
  standby: "var(--destructive)",
};
const STAGE_HOVER_CLASS: Record<Stage, string> = {
  reactor: "hover:border-[#16a34a]/40 hover:bg-[#16a34a]/5 focus-visible:border-[#16a34a]",
  heater: "hover:border-warning/40 hover:bg-warning/5 focus-visible:border-warning",
  filter: "hover:border-[#16a34a]/40 hover:bg-[#16a34a]/5 focus-visible:border-[#16a34a]",
  standby: "hover:border-destructive/40 hover:bg-destructive/5 focus-visible:border-destructive",
};
const STAGE_FOR_EQUIPMENT: Record<EquipmentId, Stage> = { R1: "reactor", H1: "heater", F1: "filter", H1B: "standby" };
const STAGE_DOT_CLASS: Record<Stage, string> = {
  reactor: "bg-[#16a34a]",
  heater: "bg-warning",
  filter: "bg-[#16a34a]",
  standby: "bg-destructive",
};

// Baseline quantities (kg per batch) and stream layout, digitized from the
// reference polymer-production flow diagram (AN + water -> R1 reactor ->
// hot-water wash on the F1 vacuum filter -> cake to dryer).
const STREAMS: StreamBox[] = [
  {
    id: "storage",
    title: "From storages",
    x: 40,
    y: 145,
    w: 130,
    stage: "reactor",
    rows: [
      { label: "AN", base: 500 },
      { label: "Water", base: 2500 },
    ],
  },
  {
    id: "catalyst",
    title: "Catalyst prep",
    x: 160,
    y: 420,
    w: 120,
    stage: "reactor",
    rows: [
      { label: "Cat.", base: 5 },
      { label: "Water", base: 100 },
    ],
  },
  {
    id: "reactor-out",
    title: "R1 outlet",
    x: 445,
    y: 478,
    w: 115,
    stage: "reactor",
    rows: [
      { label: "AN", base: 500 },
      { label: "Water", base: 2600 },
      { label: "Polymer", base: 450 },
      { label: "Salts", base: 5 },
    ],
  },
  {
    id: "wash-water",
    title: "Wash water (H1)",
    x: 590,
    y: 8,
    w: 110,
    stage: "heater",
    rows: [{ label: "Water", base: 5000 }],
  },
  {
    id: "filtrate",
    title: "Filtrate",
    x: 598,
    y: 458,
    w: 115,
    stage: "filter",
    rows: [
      { label: "Water", base: 7300 },
      { label: "AN", base: 45 },
      { label: "Polymer", base: 2 },
      { label: "Salts", base: 5 },
    ],
  },
  {
    id: "cake",
    title: "To dryer",
    x: 780,
    y: 418,
    w: 90,
    stage: "filter",
    rows: [
      { label: "AN", base: 5 },
      { label: "Water", base: 300 },
      { label: "Polymer", base: 448 },
      { label: "Salts", base: 0, trace: true },
    ],
  },
];

const TEMPS: TempBadge[] = [
  { id: "feed", base: 15, x: 280, y: 248, stage: "reactor" },
  { id: "reactor-out", base: 40, x: 495, y: 248, stage: "reactor" },
  { id: "wash-in", base: 60, x: 720, y: 72, stage: "heater" },
  { id: "cake-out", base: 60, x: 745, y: 248, stage: "filter" },
  { id: "filtrate-out", base: 60, x: 665, y: 398, stage: "filter" },
];

// Click targets over each vessel, sized to the shapes drawn in the SVG below.
const EQUIPMENT: EquipmentInfo[] = [
  {
    id: "R1",
    name: "R1 — Polymer Reactor",
    role: "Batch-polymerizes acrylonitrile (AN) and water with catalyst, under agitation and cooling water (CW), then discharges the slurry to the vacuum filter.",
    x: 315,
    y: 178,
    w: 170,
    h: 195,
  },
  {
    id: "H1",
    name: "H1 — Water Heater",
    role: "Heats incoming DM water to feed the hot-water wash on the F1 vacuum filter, displacing residual mother liquor from the polymer cake. Flagged for scheduled maintenance — still running, monitored closely until serviced.",
    x: 790,
    y: 5,
    w: 130,
    h: 130,
  },
  {
    id: "F1",
    name: "F1 — Vacuum Filter",
    role: "Dewaters the reactor slurry under vacuum, splitting it into a filtrate (recovered water, AN and salts) and a washed polymer cake sent to the dryer.",
    x: 595,
    y: 178,
    w: 150,
    h: 172,
  },
  {
    id: "H1B",
    name: "H1B — Standby Water Heater",
    role: "Redundant DM-water heater plumbed in parallel with H1, isolated at its inlet valve. Offline units like this stay on the monitored asset list so operations can see failover coverage at a glance.",
    x: 800,
    y: 138,
    w: 170,
    h: 100,
  },
];

function streamTotal(id: string, values: Record<string, Record<number, number>>) {
  const s = STREAMS.find((stream) => stream.id === id);
  if (!s) return 0;
  const rowValues = values[id] ?? {};
  return s.rows.reduce((sum, r, i) => sum + (r.trace ? 0 : rowValues[i] ?? r.base), 0);
}

function metricsFor(
  id: EquipmentId,
  values: Record<string, Record<number, number>>,
  temps: Record<string, number>,
): Metric[] {
  switch (id) {
    case "R1":
      return [
        { label: "Status", value: "Running" },
        { label: "Feed Temp", value: `${(temps.feed ?? 15).toFixed(1)}°C` },
        { label: "Outlet Temp", value: `${(temps["reactor-out"] ?? 40).toFixed(1)}°C` },
        { label: "Outlet Mass", value: `${streamTotal("reactor-out", values).toLocaleString()} kg` },
      ];
    case "H1":
      return [
        { label: "Status", value: "Needs Maintenance", tone: "warning" },
        { label: "DM Water In", value: "15.0°C" },
        { label: "Outlet Temp", value: `${(temps["wash-in"] ?? 60).toFixed(1)}°C` },
        { label: "Wash Water Flow", value: `${streamTotal("wash-water", values).toLocaleString()} kg` },
      ];
    case "F1":
      return [
        { label: "Status", value: "Running" },
        { label: "Cake Outlet Temp", value: `${(temps["cake-out"] ?? 60).toFixed(1)}°C` },
        { label: "Filtrate Outlet Temp", value: `${(temps["filtrate-out"] ?? 60).toFixed(1)}°C` },
        { label: "Filtrate Flow", value: `${streamTotal("filtrate", values).toLocaleString()} kg` },
        { label: "Cake to Dryer", value: `${streamTotal("cake", values).toLocaleString()} kg` },
      ];
    case "H1B":
      return [
        { label: "Status", value: "Offline", tone: "destructive" },
        { label: "Inlet Valve", value: "Closed" },
        { label: "DM Water Flow", value: "0 kg" },
        { label: "Standby For", value: "H1" },
      ];
  }
}

function jitteredRows(seedRows: Row[]) {
  const next: Record<number, number> = {};
  seedRows.forEach((r, i) => {
    if (r.trace) {
      next[i] = 0;
      return;
    }
    const delta = (Math.random() - 0.5) * 2 * r.base * 0.02;
    next[i] = Math.max(0, Math.round(r.base + delta));
  });
  return next;
}

export function PolymerFlowDiagram() {
  const arrowId = useId();

  const [values, setValues] = useState<Record<string, Record<number, number>>>(() => {
    const init: Record<string, Record<number, number>> = {};
    for (const s of STREAMS) init[s.id] = Object.fromEntries(s.rows.map((r, i) => [i, r.base]));
    return init;
  });
  const [temps, setTemps] = useState<Record<string, number>>(() =>
    Object.fromEntries(TEMPS.map((t) => [t.id, t.base])),
  );
  const [selected, setSelected] = useState<EquipmentId | null>(null);
  const activeEquipment = EQUIPMENT.find((eq) => eq.id === selected) ?? null;

  useEffect(() => {
    const interval = setInterval(() => {
      setValues(() => {
        const next: Record<string, Record<number, number>> = {};
        for (const s of STREAMS) next[s.id] = jitteredRows(s.rows);
        return next;
      });
      setTemps(() =>
        Object.fromEntries(
          TEMPS.map((t) => [t.id, Math.round((t.base + (Math.random() - 0.5) * 1.2) * 10) / 10]),
        ),
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const leftPct = (x: number) => `${(x / VB_W) * 100}%`;
  const topPct = (y: number) => `${(y / VB_H) * 100}%`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Polymer Reactor → Filtration Line</CardTitle>
          <CardDescription>
            Live mass balance across R1 (polymer reactor), H1 (wash-water heater) and F1 (vacuum filter).
            Click a vessel for its live readings.
          </CardDescription>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-foreground">
          <span className="relative flex size-2.5 items-center justify-center">
            <span className="absolute size-2.5 animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative size-1.5 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full">
            <defs>
              <marker
                id={`${arrowId}-arrow`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 Z" style={{ fill: "var(--muted-foreground)" }} />
              </marker>
            </defs>

            <g style={{ stroke: "var(--muted-foreground)" }} strokeWidth={2} fill="none">
              {/* storage -> main feed pipe */}
              <line x1={105} y1={223} x2={105} y2={248} />
              <line x1={0} y1={248} x2={322} y2={248} markerEnd={`url(#${arrowId}-arrow)`} />
              {/* catalyst riser */}
              <line x1={220} y1={610} x2={220} y2={512} markerEnd={`url(#${arrowId}-arrow)`} />
              <line x1={220} y1={420} x2={220} y2={248} />
              {/* R1 outlet -> F1, with branch down to reactor-out box */}
              <line x1={478} y1={248} x2={605} y2={248} markerEnd={`url(#${arrowId}-arrow)`} />
              <line x1={530} y1={248} x2={530} y2={478} markerEnd={`url(#${arrowId}-arrow)`} />
              {/* wash water box -> H1 -> down into F1 top */}
              <line x1={647} y1={66} x2={647} y2={90} />
              <line x1={815} y1={90} x2={647} y2={90} />
              <line x1={647} y1={90} x2={647} y2={215} markerEnd={`url(#${arrowId}-arrow)`} />
              {/* DM water feed into H1 */}
              <line x1={960} y1={90} x2={877} y2={90} markerEnd={`url(#${arrowId}-arrow)`} />
              {/* standby DM water feed into H1B, isolated at its valve */}
              <line x1={960} y1={165} x2={937} y2={165} strokeDasharray="5 4" />
              <line x1={919} y1={165} x2={894} y2={165} strokeDasharray="5 4" />
              {/* F1 -> to dryer, with branch down to cake box */}
              <line x1={690} y1={248} x2={990} y2={248} markerEnd={`url(#${arrowId}-arrow)`} />
              <line x1={827} y1={248} x2={827} y2={418} markerEnd={`url(#${arrowId}-arrow)`} />
              {/* F1 cone -> filtrate box */}
              <line x1={647} y1={345} x2={647} y2={458} markerEnd={`url(#${arrowId}-arrow)`} />
              {/* R1 flange ports: feed-in/return on the left, CW-in on the right */}
              <line x1={322} y1={287} x2={297} y2={287} markerEnd={`url(#${arrowId}-arrow)`} />
              <line x1={503} y1={287} x2={478} y2={287} markerEnd={`url(#${arrowId}-arrow)`} />
            </g>

            {[
              [105, 248],
              [220, 248],
              [530, 248],
              [647, 90],
              [827, 248],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} style={{ fill: "var(--muted-foreground)" }} />
            ))}

            {/* R1 reactor vessel — cylindrical drum with side flanges */}
            <g className="fill-[#16a34a]/10 stroke-[#16a34a]" strokeWidth={1.5}>
              <path d="M345,210 Q400,195 455,210 L455,325 Q400,340 345,325 Z" />
              <rect x={322} y={235} width={23} height={65} />
              <rect x={455} y={235} width={23} height={65} />
              <rect x={385} y={183} width={30} height={22} />
            </g>
            <g className="stroke-foreground" strokeWidth={1.5} fill="none">
              <line x1={370} y1={190} x2={430} y2={190} />
              <line x1={370} y1={199} x2={430} y2={199} />
              <line x1={400} y1={205} x2={400} y2={238} />
              {/* bowtie kneader rotor */}
              <path d="M400,267 C388,255 372,255 372,267 C372,279 388,279 400,267 Z M400,267 C412,255 428,255 428,267 C428,279 412,279 400,267 Z" />
            </g>
            <circle cx={430} cy={352} r={14} className="fill-[#16a34a]/10 stroke-[#16a34a]" strokeWidth={1.5} />
            <text x={430} y={356} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-[#16a34a]">
              R1
            </text>

            {/* H1 heater */}
            <circle
              cx={845}
              cy={90}
              r={30}
              className="stroke-warning"
              strokeWidth={1.5}
              style={{ fill: "color-mix(in oklch, var(--warning) 14%, var(--card))" }}
            />
            <path
              d="M825,68 L865,80 L825,102 L865,114"
              className="stroke-foreground"
              strokeWidth={1.5}
              fill="none"
              strokeLinejoin="round"
            />
            <circle
              cx={845}
              cy={40}
              r={13}
              className="stroke-warning"
              strokeWidth={1.5}
              style={{ fill: "color-mix(in oklch, var(--warning) 14%, var(--card))" }}
            />
            <text x={845} y={44} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-warning">
              H1
            </text>
            {/* maintenance notification */}
            <g className="fill-warning">
              <path d="M802,9 L809,21 L795,21 Z" strokeLinejoin="round" />
              <text x={802} y={19} textAnchor="middle" fontSize={8} fontWeight={700} className="fill-warning-foreground">
                !
              </text>
              <text x={815} y={19} fontSize={10} fontWeight={600}>
                Needs maintenance
              </text>
            </g>

            {/* H1B standby heater — plumbed in parallel with H1, isolated (closed valve), offline */}
            <circle
              cx={870}
              cy={165}
              r={24}
              className="fill-destructive/10 stroke-destructive"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <path
              d="M854,147 L886,157 L854,175 L886,184"
              className="stroke-destructive"
              strokeWidth={1.5}
              fill="none"
              strokeLinejoin="round"
              opacity={0.6}
            />
            {/* closed-valve glyph on the isolated feed line */}
            <path d="M919,157 L937,165 L919,173 Z M937,157 L919,165 L937,173 Z" className="fill-destructive" />
            <text x={870} y={203} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-destructive">
              H1B
            </text>
            <g className="fill-destructive">
              <circle cx={849} cy={221} r={3} />
              <text x={857} y={224} fontSize={10} fontWeight={600}>
                Offline
              </text>
            </g>

            {/* F1 vacuum filter vessel */}
            <g className="fill-[#16a34a]/10 stroke-[#16a34a]" strokeWidth={1.5}>
              <rect x={605} y={215} width={85} height={90} />
              <path d="M605,305 L690,305 L647,345 Z" />
              <circle cx={647} cy={258} r={20} fill="none" />
            </g>
            <circle cx={735} cy={195} r={14} className="fill-[#16a34a]/10 stroke-[#16a34a]" strokeWidth={1.5} />
            <text x={735} y={199} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-[#16a34a]">
              F1
            </text>

            <g style={{ fill: "var(--muted-foreground)" }} fontSize={12}>
              <text x={5} y={238}>From storages</text>
              <text x={95} y={608}>From catalyst prep</text>
              <text x={508} y={303}>CW</text>
              <text x={882} y={128}>DM Water</text>
              <text x={886} y={238}>To dryer</text>
            </g>
          </svg>

          {EQUIPMENT.map((eq) => (
            <button
              key={eq.id}
              type="button"
              onClick={() => setSelected(eq.id)}
              aria-label={`View ${eq.name} details`}
              title={`${eq.name} — click for details`}
              className={cn(
                "absolute cursor-pointer rounded-lg border border-transparent transition focus-visible:outline-none",
                STAGE_HOVER_CLASS[STAGE_FOR_EQUIPMENT[eq.id]],
              )}
              style={{ left: leftPct(eq.x), top: topPct(eq.y), width: leftPct(eq.w), height: topPct(eq.h) }}
            />
          ))}

          {STREAMS.map((s) => {
            const rowValues = values[s.id] ?? {};
            const total = s.rows.reduce((sum, r, i) => sum + (r.trace ? 0 : rowValues[i] ?? r.base), 0);
            return (
              <div
                key={s.id}
                className="absolute rounded-md border border-border px-2 py-1.5 shadow-sm"
                style={{
                  left: leftPct(s.x),
                  top: topPct(s.y),
                  width: leftPct(s.w),
                  borderLeftWidth: 3,
                  borderLeftColor: STAGE_VAR[s.stage],
                  backgroundColor: `color-mix(in oklch, ${STAGE_VAR[s.stage]} 5%, var(--card))`,
                }}
              >
                <div className="mb-1 truncate text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                  {s.title}
                </div>
                {s.rows.map((r, i) => (
                  <div key={r.label} className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {r.trace ? (
                        "trace"
                      ) : (
                        <>
                          {(rowValues[i] ?? r.base).toLocaleString()}
                          <span className="ml-0.5 font-sans text-[9px] font-normal text-muted-foreground">kg</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1 text-[11px] leading-tight font-semibold">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">
                    {total.toLocaleString()}
                    <span className="ml-0.5 font-sans text-[9px] font-normal text-muted-foreground">kg</span>
                  </span>
                </div>
              </div>
            );
          })}

          {TEMPS.map((t) => (
            <div
              key={t.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-foreground shadow-sm"
              style={{ left: leftPct(t.x), top: topPct(t.y), borderColor: STAGE_VAR[t.stage] }}
            >
              {(temps[t.id] ?? t.base).toFixed(1)}°C
            </div>
          ))}

          <div
            className="absolute rounded-md border border-border bg-card/95 px-2.5 py-2 text-[11px] shadow-sm"
            style={{ left: leftPct(888), top: topPct(470), width: leftPct(100) }}
          >
            <div className="mb-1 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
              Equipment key
            </div>
            <div className="space-y-1 text-foreground">
              <div className="flex items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", STAGE_DOT_CLASS.reactor)} />
                <span className="font-mono font-semibold">R1</span> Polymer reactor
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", STAGE_DOT_CLASS.heater)} />
                <span className="font-mono font-semibold">H1</span> Water heater
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", STAGE_DOT_CLASS.filter)} />
                <span className="font-mono font-semibold">F1</span> Vacuum filter
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {activeEquipment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className={cn("size-2 shrink-0 rounded-full", STAGE_DOT_CLASS[STAGE_FOR_EQUIPMENT[activeEquipment.id]])}
                  />
                  {activeEquipment.name}
                </DialogTitle>
                <DialogDescription>{activeEquipment.role}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {metricsFor(activeEquipment.id, values, temps).map((m) => (
                  <div key={m.label} className="rounded-md bg-muted/50 px-3 py-2">
                    <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {m.label}
                    </div>
                    <div
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        m.tone === "destructive" && "text-destructive",
                        m.tone === "warning" && "text-warning",
                        !m.tone && "text-foreground",
                      )}
                    >
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
