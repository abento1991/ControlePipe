import { cn } from "@/lib/utils";

export function StatusBadge({ name, color, className, group }: { name: string; color?: string | null; className?: string; group?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-2xs font-medium whitespace-nowrap", group === "LEGACY" && "border-dashed", className)}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color ?? "#9a9a9a" }} />
      {name}
    </span>
  );
}

export function TypeBadge({ name, color, className }: { name: string | null | undefined; color?: string | null; className?: string }) {
  if (!name) return <span className="text-2xs text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", className)} style={{ backgroundColor: `${color ?? "#9a9a9a"}1f`, color: color ?? "#555" }}>
      {name}
    </span>
  );
}

export function DaysBadge({ days, className }: { days: number | null; className?: string }) {
  if (days === null) return <span className="text-2xs text-muted-foreground">—</span>;
  const tone = days > 90 ? "text-danger" : days > 60 ? "text-[#7a5a17]" : days > 30 ? "text-foreground" : "text-muted-foreground";
  return <span className={cn("tabular text-xs font-medium", tone, className)}>{days}d</span>;
}
