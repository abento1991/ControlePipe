import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function KpiCard({ label, value, hint, accent, className, size = "md" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: "green" | "amber" | "red" | "blue" | "none"; className?: string; size?: "md" | "lg" }) {
  const bar = accent === "green" ? "bg-leto-green" : accent === "amber" ? "bg-warning" : accent === "red" ? "bg-danger" : accent === "blue" ? "bg-info" : "bg-transparent";
  return (
    <Card className={cn("relative overflow-hidden p-4", className)}>
      <span className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-r", bar)} />
      <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold tracking-tight tabular", size === "lg" ? "text-3xl" : "text-2xl")}>{value}</p>
      {hint && <p className="mt-1 text-2xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
