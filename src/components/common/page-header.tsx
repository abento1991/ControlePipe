import { cn } from "@/lib/utils";

export const DEFAULT_EYEBROW = "Leto Capital · Special Situations";

export function PageHeader({ title, description, children, className, eyebrow = DEFAULT_EYEBROW }: { title: string; description?: string; children?: React.ReactNode; className?: string; eyebrow?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 mb-4", className)}>
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-leto-green-deep mb-1">{eyebrow}</p>}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
