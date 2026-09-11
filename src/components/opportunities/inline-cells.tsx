"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatDate, formatMM, toDateInput } from "@/lib/utils";
import { useReference } from "@/components/layout/reference-context";
import { quickUpdateOpportunity } from "@/lib/actions/opportunities";
import { EntityCombobox, type EntityOption } from "@/components/common/entity-combobox";
import { CompanyFormDialog } from "@/components/originators/company-form-dialog";
import { ContactFormDialog } from "@/components/originators/contact-form-dialog";
import { TypeBadge } from "@/components/common/badges";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHANNEL_OPTIONS } from "@/lib/constants";
import { CHANNEL_LABELS } from "@/lib/queries/dashboard";

type QuickInput = Parameters<typeof quickUpdateOpportunity>[1];

function useQuick(id: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (input: QuickInput, okMsg?: string) =>
    start(async () => {
      const res = await quickUpdateOpportunity(id, input);
      if (!res.ok) toast.error(res.error);
      else {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      }
    });
  return { save, pending };
}

/** Click-to-edit text (name, grupo econômico, setor). Enter saves, Esc cancels. */
export function TextCell({ id, field, value, className, placeholder = "—", strong }: { id: string; field: "name" | "economicGroup" | "sector" | "emailSubject"; value: string | null; className?: string; placeholder?: string; strong?: boolean }) {
  const { save, pending } = useQuick(id);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  if (editing) {
    return (
      <Input
        autoFocus
        value={text}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (text.trim() !== (value ?? "")) save({ [field]: text.trim() || null } as QuickInput);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setText(value ?? "");
            setEditing(false);
          }
        }}
        className="h-7 text-xs px-1.5 -mx-1.5"
      />
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setText(value ?? "");
        setEditing(true);
      }}
      title="Clique para editar"
      className={cn("w-full text-left rounded px-1 -mx-1 hover:bg-muted truncate block", strong ? "font-medium" : "text-xs", !value && "text-muted-foreground italic", pending && "opacity-50", className)}
    >
      {value || placeholder}
    </button>
  );
}

export function TypeCell({ id, type }: { id: string; type: { id: string; name: string; color: string | null } | null }) {
  const ref = useReference();
  const { save, pending } = useQuick(id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("rounded hover:ring-1 hover:ring-leto-green", pending && "opacity-50")} title="Clique para alterar o tipo">
          {type ? <TypeBadge name={type.name} color={type.color} /> : <span className="text-2xs text-muted-foreground italic">definir tipo</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-auto" onClick={(e) => e.stopPropagation()}>
        {ref.types.map((t) => (
          <DropdownMenuItem key={t.id} disabled={t.id === type?.id} onSelect={() => save({ operationTypeId: t.id })}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color ?? "#999" }} /> {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChannelCell({ id, value }: { id: string; value: string | null }) {
  const { save, pending } = useQuick(id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("text-xs rounded px-1 -mx-1 hover:bg-muted", !value && "text-muted-foreground italic", pending && "opacity-50")}>
          {value ? CHANNEL_LABELS[value] ?? value : "canal"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {CHANNEL_OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} disabled={o.value === value} onSelect={() => save({ entryChannel: o.value })}>
            {o.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => save({ entryChannel: null })}>— limpar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DateCell({ id, field, value, className }: { id: string; field: "entryDate" | "nextFollowUpAt"; value: string | null; className?: string }) {
  const { save, pending } = useQuick(id);
  return (
    <label onClick={(e) => e.stopPropagation()} className={cn("relative block tabular text-xs rounded px-1 -mx-1 hover:bg-muted cursor-pointer", !value && "text-muted-foreground italic", pending && "opacity-50", className)} title="Clique para alterar">
      {value ? formatDate(value) : "definir"}
      <input type="date" suppressHydrationWarning className="absolute inset-0 opacity-0 cursor-pointer w-full" defaultValue={toDateInput(value)} onChange={(e) => save({ [field]: e.target.value || null } as QuickInput)} />
    </label>
  );
}

export function AmountCell({ id, value, raw }: { id: string; value: number | null; raw: string | null }) {
  const { save, pending } = useQuick(id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value?.toString().replace(".", ",") ?? "");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("w-full text-right tabular text-xs rounded px-1 -mx-1 hover:bg-muted", value === null && "text-muted-foreground", pending && "opacity-50")} title="Clique para editar o valor">
          {value !== null ? formatMM(value) : raw ? raw : "—"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" onClick={(e) => e.stopPropagation()}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            save({ amount: text || null });
            setOpen(false);
          }}
        >
          <div className="text-2xs text-muted-foreground">Valor em R$ milhões</div>
          <Input autoFocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} placeholder="ex.: 12,5" className="h-8" />
          <div className="flex justify-end gap-1">
            <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="xs">
              Salvar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function OriginatorCell({ id, kind, company, contact, rawText }: { id: string; kind: "company" | "contact"; company: { id: string; name: string } | null; contact: { id: string; fullName: string } | null; rawText: string | null }) {
  const { save, pending } = useQuick(id);
  const [open, setOpen] = useState(false);
  const [create, setCreate] = useState<string | null>(null);
  const current: EntityOption | null = kind === "company" ? (company ? { id: company.id, label: company.name } : null) : contact ? { id: contact.id, label: contact.fullName } : null;
  const empty = !company && !contact;
  return (
    <div onClick={(e) => e.stopPropagation()} className={cn(pending && "opacity-50")}>
      {open ? (
        <div className="w-[220px]">
          <EntityCombobox
            kind={kind}
            value={current}
            companyId={kind === "contact" ? company?.id ?? null : undefined}
            onChange={(v) => {
              setOpen(false);
              save(kind === "company" ? { companyId: v?.id ?? null } : { contactId: v?.id ?? null });
            }}
            onCreate={(q) => {
              setOpen(false);
              setCreate(q);
            }}
            className="h-7 text-xs"
            autoOpen
          />
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className={cn("w-full text-left text-xs rounded px-1 -mx-1 hover:bg-muted truncate block", !current && "text-muted-foreground italic")} title="Clique para definir">
          {current?.label ?? (kind === "company" && empty && rawText ? <span className="not-italic text-muted-foreground" title={`Planilha: ${rawText}`}>{rawText}</span> : kind === "company" ? "empresa" : "pessoa")}
        </button>
      )}
      {kind === "company" ? (
        <CompanyFormDialog key={`c-${create ?? ""}`} open={create !== null} onOpenChange={(o) => !o && setCreate(null)} initial={{ name: create ?? "" }} onSaved={(c) => save({ companyId: c.id }, `Empresa ${c.name} vinculada.`)} />
      ) : (
        <ContactFormDialog key={`p-${create ?? ""}`} open={create !== null} onOpenChange={(o) => !o && setCreate(null)} initial={{ firstName: (create ?? "").split(" ")[0] ?? "", lastName: (create ?? "").split(" ").slice(1).join(" ") || null, company: company ? { id: company.id, label: company.name } : null }} onSaved={(c) => save({ contactId: c.id, ...(c.companyId && !company ? { companyId: c.companyId } : {}) }, `${c.fullName} vinculado.`)} />
      )}
    </div>
  );
}
