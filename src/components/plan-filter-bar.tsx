"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STREAMS } from "@/lib/filter-options";

export function PlanFilterBar({
  plants,
  plant,
  stream,
  month,
}: {
  plants: { id: string; code: string; name: string }[];
  plant: string;
  stream: string;
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const plantLabel = (v: string) => {
    if (v === "all") return "All plants";
    const p = plants.find((p) => p.code === v);
    return p ? `${p.name} (${p.code})` : v;
  };
  const streamLabel = (v: string) =>
    v === "all" ? "All streams" : (STREAMS.find((s) => s.value === v)?.label ?? v);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={plant} onValueChange={(v) => update("plant", v)}>
        <SelectTrigger className="w-[180px]">
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
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Stream">{streamLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All streams</SelectItem>
          {STREAMS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="month"
        value={month}
        onChange={(e) => update("month", e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
      />
    </div>
  );
}
