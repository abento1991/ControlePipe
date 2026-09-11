"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Pencil } from "lucide-react";
import { cn, formatDate, toDateInput } from "@/lib/utils";
import { useReference } from "@/components/layout/reference-context";
import { quickUpdateOpportunity } from "@/lib/actions/opportunities";
import { StatusBadge } from "@/components/common/badges";
import { AssigneeAvatars, UserAvatar } from "@/components/common/user-avatar";
import { MultiSelect } from "@/components/common/multi-select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GROUP_LABELS: Record<string, string> = { ACTIVE: "Ativo", ON_HOLD: "On Hold", CONCLUDED: "Concluído", CLOSED: "Encerrado" };

export function StatusCell({ id, status }: { id: string; status: { key: string; name: string; color: string | null; group: string } }) {
  const ref = useReference();
  const router = useRouter();
  const [pending, start] = useTransition();
  const groups = ["ACTIVE", "ON_HOLD", "CONCLUDED", "CLOSED"].map((g) => ({ g, items: ref.statuses.filter((s) => s.group === g) }));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", pending && "opacity-50")} onClick={(e) => e.stopPropagation()}>
          <StatusBadge name={status.name} color={status.color} group={status.group} className="hover:border-leto-green" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" onClick={(e) => e.stopPropagation()}>
        {groups.map((g, i) => (
          <div key={g.g}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{GROUP_LABELS[g.g]}</DropdownMenuLabel>
            {g.items.map((s) => (
              <DropdownMenuItem
                key={s.key}
                disabled={s.key === status.key}
                onSelect={() =>
                  start(async () => {
                    const res = await quickUpdateOpportunity(id, { statusKey: s.key });
                    if (!res.ok) toast.error(res.error);
                    else {
                      toast.success(`Status: ${s.name}`);
                      router.refresh();
                    }
                  })
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color ?? "#999" }} />
                {s.name}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneesCell({ id, assignees }: { id: string; assignees: { id: string; name: string; initials: string | null; color: string | null; isArchived: boolean }[] }) {
  const ref = useReference();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(assignees.map((a) => a.id));
  const options = ref.users.map((u) => ({ value: u.id, label: u.name, color: u.color }));
  const archived = assignees.filter((a) => a.isArchived);
  return (
    <div onClick={(e) => e.stopPropagation()} className={cn(pending && "opacity-50")}>
      <MultiSelect
        options={[...options, ...archived.map((a) => ({ value: a.id, label: a.name, color: a.color }))]}
        value={value}
        onChange={(v) => {
          setValue(v);
          start(async () => {
            const res = await quickUpdateOpportunity(id, { assigneeIds: v });
            if (!res.ok) toast.error(res.error);
            else router.refresh();
          });
        }}
        size="sm"
        className="min-w-0 border-transparent bg-transparent shadow-none px-1 hover:border-input"
        renderValue={(sel) => (sel.length ? <AssigneeAvatars users={sel.map((s) => ({ id: s.value, name: s.label, color: s.color }))} /> : <span className="text-2xs text-muted-foreground">Atribuir</span>)}
      />
    </div>
  );
}

export function NextActionCell({ id, value }: { id: string; value: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ?? "");
  const [pending, start] = useTransition();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("group/na flex w-full items-center gap-1 text-left text-xs rounded px-1 -mx-1 hover:bg-muted", !value && "text-muted-foreground italic", pending && "opacity-50")}>
          <span className="truncate flex-1">{value || "Definir próxima ação"}</span>
          <Pencil className="h-3 w-3 opacity-0 group-hover/na:opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await quickUpdateOpportunity(id, { nextAction: text || null });
              if (!res.ok) toast.error(res.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Próxima ação" autoFocus />
          <div className="flex justify-end gap-1">
            <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="xs" disabled={pending}>
              Salvar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function FollowUpCell({ id, value }: { id: string; value: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const overdue = value ? new Date(value) < new Date(new Date().toDateString()) : false;
  return (
    <label onClick={(e) => e.stopPropagation()} className={cn("relative flex items-center gap-1 text-xs rounded px-1 -mx-1 hover:bg-muted cursor-pointer", overdue && "text-danger font-medium", !value && "text-muted-foreground", pending && "opacity-50")}>
      <CalendarClock className="h-3 w-3 shrink-0" />
      <span>{value ? formatDate(value) : "Agendar"}</span>
      <input
        type="date"
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
        defaultValue={toDateInput(value)}
        onChange={(e) => {
          const v = e.target.value || null;
          start(async () => {
            const res = await quickUpdateOpportunity(id, { nextFollowUpAt: v });
            if (!res.ok) toast.error(res.error);
            else router.refresh();
          });
        }}
      />
    </label>
  );
}

export function UserChip({ name, color, initials }: { name: string; color: string | null; initials?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted pr-2 text-2xs">
      <UserAvatar name={name} color={color} initials={initials} className="h-5 w-5 text-[9px]" /> {name}
    </span>
  );
}
