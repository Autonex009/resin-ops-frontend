"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type FilterChip = { key: string; label: string };

export function ActiveFilterChips({ chips }: { chips: FilterChip[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (chips.length === 0) return null;

  function remove(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const chip of chips) params.delete(chip.key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
          {chip.label}
          <button
            type="button"
            onClick={() => remove(chip.key)}
            className="rounded-sm p-0.5 hover:bg-foreground/10"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
