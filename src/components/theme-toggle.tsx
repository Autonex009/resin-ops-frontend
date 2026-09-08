"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Icons swap purely via the html.dark class, so there is no
          hydration mismatch before next-themes resolves. */}
      <Sun className="hidden [html:not(.dark)_&]:block" />
      <Moon className="hidden [html.dark_&]:block" />
    </Button>
  );
}
