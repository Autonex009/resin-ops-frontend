import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "warning" | "muted" | "success";

const toneStyles: Record<
  Tone,
  { accent: string; chip: string; value: string }
> = {
  default: {
    accent: "before:bg-primary",
    chip: "bg-primary/10 text-primary",
    value: "text-foreground",
  },
  success: {
    accent: "before:bg-success",
    chip: "bg-success/12 text-success",
    value: "text-foreground",
  },
  warning: {
    accent: "before:bg-warning",
    chip: "bg-warning/12 text-warning",
    value: "text-warning",
  },
  muted: {
    accent: "before:bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground",
    value: "text-muted-foreground",
  },
};

export function KpiCard({
  title,
  value,
  subtext,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const t = toneStyles[tone];

  return (
    <Card
      className={cn(
        "relative gap-2 pl-5 transition-shadow hover:ring-foreground/20",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-xl",
        t.accent,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            t.chip,
          )}
        >
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums",
            t.value,
          )}
        >
          {value}
        </div>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
