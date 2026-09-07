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
import { COMMITMENT_STATUSES } from "@/lib/filter-options";

export function CommitmentsFilterBar({
  plants,
  businessGroups,
  plant,
  businessGroup,
  status,
}: {
  plants: Plant[];
  businessGroups: string[];
  plant: string;
  businessGroup: string;
  status: string;
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
  const businessGroupLabel = (v: string) => (v === "all" ? "All business groups" : v);
  const statusLabel = (v: string) =>
    v === "all" ? "Any status" : (COMMITMENT_STATUSES.find((s) => s.value === v)?.label ?? v);

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
      <Select value={businessGroup} onValueChange={(v) => update("businessGroup", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Business Group">{businessGroupLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All business groups</SelectItem>
          {businessGroups.map((bg) => (
            <SelectItem key={bg} value={bg}>
              {bg}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status">{statusLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any status</SelectItem>
          {COMMITMENT_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
