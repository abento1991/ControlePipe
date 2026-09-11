import { cn, initials as initialsOf } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function UserAvatar({ name, initials, color, className, isArchived }: { name: string; initials?: string | null; color?: string | null; className?: string; isArchived?: boolean }) {
  return (
    <span
      className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-2xs font-semibold text-white ring-2 ring-card select-none", isArchived && "opacity-60 grayscale", className)}
      style={{ backgroundColor: color ?? "#6b7266" }}
      title={name}
    >
      {initials || initialsOf(name)}
    </span>
  );
}

export function AssigneeAvatars({ users, max = 3, size = "sm" }: { users: { id: string; name: string; initials?: string | null; color?: string | null; isArchived?: boolean }[]; max?: number; size?: "sm" | "md" }) {
  if (!users.length) return <span className="text-2xs text-muted-foreground">—</span>;
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  const cls = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6";
  return (
    <div className="flex -space-x-1.5">
      {shown.map((u) => (
        <Tooltip key={u.id}>
          <TooltipTrigger asChild>
            <span>
              <UserAvatar name={u.name} initials={u.initials} color={u.color} isArchived={u.isArchived} className={cls} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{u.name}</TooltipContent>
        </Tooltip>
      ))}
      {rest > 0 && <span className={cn("inline-flex items-center justify-center rounded-full bg-muted text-2xs font-medium ring-2 ring-card", cls)}>+{rest}</span>}
    </div>
  );
}
