import { cn } from "@/lib/utils";

export function PageHeader({ title, description, children, className, eyebrow }: { title: string; description?: string; children?: React.ReactNode; className?: string; eyebrow?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 mb-4", className)}>
      <div>
        {eyebrow && <p className="text-2xs font-semibold uppercase tracking-wider text-leto-green-deep mb-0.5">{eyebrow}</p>}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
