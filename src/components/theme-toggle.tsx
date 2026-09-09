"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      // Keep this static: resolvedTheme is unknown during SSR, so a
      // theme-dependent title would cause a hydration mismatch.
      title="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Icons swap purely via the html.dark class, so there is no
          hydration mismatch before next-themes resolves. */}
      <Sun className="hidden [html:not(.dark)_&]:block" />
      <Moon className="hidden [html.dark_&]:block" />
    </Button>
  );
}
