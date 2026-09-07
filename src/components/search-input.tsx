"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("search") ?? "";
  const [value, setValue] = useState(urlValue);
  const [syncedUrlValue, setSyncedUrlValue] = useState(urlValue);

  if (urlValue !== syncedUrlValue) {
    setSyncedUrlValue(urlValue);
    setValue(urlValue);
  }

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (value === current) return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("search", value);
      else params.delete("search");
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 400);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-[220px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
