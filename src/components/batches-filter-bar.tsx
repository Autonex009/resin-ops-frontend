"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plant } from "@/lib/api-client";
import { BATCH_SCHEDULES, BATCH_STATUSES, BATCH_STREAMS } from "@/lib/filter-options";

export function BatchesFilterBar({
  plants,
  plant,
  stream,
  status,
  schedule,
}: {
  plants: Plant[];
  plant: string;
  stream: string;
  status: string;
  schedule: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const plantLabel = (v: string) => {
    if (v === "all") return "All plants";
    const p = plants.find((p) => p.code === v);
    return p ? `${p.name} (${p.code})` : v;
  };
  const streamLabel = (v: string) =>
    v === "all" ? "All streams" : (BATCH_STREAMS.find((s) => s.value === v)?.label ?? v);
  const statusLabel = (v: string) =>
    v === "all" ? "All statuses" : (BATCH_STATUSES.find((s) => s.value === v)?.label ?? v);
  const scheduleLabel = (v: string) =>
    v === "all" ? "Any schedule" : (BATCH_SCHEDULES.find((s) => s.value === v)?.label ?? v);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={plant} onValueChange={(v) => update("plant", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Plant">{plantLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All plants</SelectItem>
          {plants.map((p) => (
            <SelectItem key={p.id} value={p.code}>
              {p.name} ({p.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={stream} onValueChange={(v) => update("stream", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Stream">{streamLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All streams</SelectItem>
          {BATCH_STREAMS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status">{statusLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {BATCH_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={schedule} onValueChange={(v) => update("schedule", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Schedule">{scheduleLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any schedule</SelectItem>
          {BATCH_SCHEDULES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
