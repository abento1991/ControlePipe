"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail, MessageCircle, Plus, Search } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/common/multi-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ContactFormDialog } from "./contact-form-dialog";
import { CompanyFormDialog } from "./company-form-dialog";
import { CATEGORY_OPTIONS, RELATIONSHIP_OPTIONS, labelOf } from "@/lib/constants";
import type { OriginatorCrmRow } from "@/lib/queries/originators";
import { cn, daysSince, formatDate, formatInt, formatMM, formatPct, whatsappLink } from "@/lib/utils";

const COLUMN_LABELS: Record<string, string> = { name: "Originador", companyName: "Empresa", category: "Categoria", casesYear: "Casos no ano", casesTotal: "Histórico", active: "Ativos", onHold: "On Hold", concluded: "Concluídos", advanced: "Avançaram", conversion: "Conversão", volume: "Volume (R$ mm)", lastInteractionAt: "Última interação", nextFollowUpAt: "Próximo follow-up", relationship: "Relacionamento", contact: "Contato" };

function heat(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days > 180) return "text-danger";
  if (days > 90) return "text-[#7a5a17]";
  return "";
}

export function CrmTable({ rows, kind, year, storageKey }: { rows: OriginatorCrmRow[]; kind: "contact" | "company"; year: number; storageKey: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [cats, setCats] = React.useState<string[]>([]);
  const [rels, setRels] = React.useState<string[]>([]);
  const [only, setOnly] = React.useState<string>("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const now = React.useMemo(() => new Date(), []);

  const data = React.useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (k && !`${r.name} ${r.companyName ?? ""} ${r.email ?? ""}`.toLowerCase().includes(k)) return false;
      if (cats.length && !cats.includes(r.category ?? "")) return false;
      if (rels.length && !rels.includes(r.relationship)) return false;
      if (only === "withCases" && !r.casesTotal) return false;
      if (only === "year" && !r.casesYear) return false;
      if (only === "active" && !r.active) return false;
      if (only === "concluded" && !r.concluded) return false;
      if (only === "followup" && !(r.nextFollowUpAt && new Date(r.nextFollowUpAt) <= now)) return false;
      if (only === "cooling") {
        const d = daysSince(r.lastInteractionAt, now);
        if (!(r.casesTotal > 0 && (d === null || d > 120))) return false;
      }
      return true;
    });
  }, [rows, q, cats, rels, only, now]);

  const columns = React.useMemo<ColumnDef<OriginatorCrmRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: kind === "contact" ? "Originador" : "Empresa",
        size: 220,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium truncate flex items-center gap-1.5">
              {row.original.name}
              {row.original.needsReview && <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Precisa de revisão (migração)" />}
            </div>
            {row.original.title && <div className="text-2xs text-muted-foreground truncate">{row.original.title}</div>}
          </div>
        ),
      },
      ...(kind === "contact" ? [{ id: "companyName", accessorKey: "companyName", header: "Empresa", size: 170, cell: ({ getValue }) => <span className="text-xs truncate block">{getValue<string | null>() ?? <span className="text-muted-foreground">—</span>}</span> } as ColumnDef<OriginatorCrmRow, unknown>] : []),
      { id: "category", accessorKey: "category", header: "Categoria", size: 130, cell: ({ getValue }) => <Badge variant="muted">{labelOf(CATEGORY_OPTIONS, getValue<string | null>())}</Badge> },
      { id: "casesYear", accessorKey: "casesYear", header: `Casos ${year}`, size: 80, cell: ({ getValue }) => <span className="tabular text-xs font-medium">{formatInt(getValue<number>())}</span> },
      { id: "casesTotal", accessorKey: "casesTotal", header: "Histórico", size: 80, cell: ({ getValue }) => <span className="tabular text-xs">{formatInt(getValue<number>())}</span> },
      { id: "active", accessorKey: "active", header: "Ativos", size: 70, cell: ({ getValue }) => <span className={cn("tabular text-xs", getValue<number>() > 0 && "font-semibold text-leto-green-deep")}>{formatInt(getValue<number>())}</span> },
      { id: "onHold", accessorKey: "onHold", header: "On Hold", size: 70, cell: ({ getValue }) => <span className="tabular text-xs">{formatInt(getValue<number>())}</span> },
      { id: "advanced", accessorKey: "advanced", header: "Avançaram", size: 90, cell: ({ getValue }) => <span className="tabular text-xs">{formatInt(getValue<number>())}</span> },
      { id: "concluded", accessorKey: "concluded", header: "Concluídos", size: 90, cell: ({ getValue }) => <span className={cn("tabular text-xs", getValue<number>() > 0 && "font-semibold")}>{formatInt(getValue<number>())}</span> },
      { id: "conversion", accessorKey: "conversion", header: "Conversão", size: 90, cell: ({ getValue }) => <span className="tabular text-xs">{formatPct(getValue<number | null>(), 0)}</span> },
      { id: "volume", accessorKey: "volume", header: "Volume (R$ mm)", size: 120, cell: ({ getValue }) => <span className="tabular text-xs">{getValue<number>() ? formatMM(getValue<number>(), { compact: true }) : "—"}</span> },
      { id: "lastInteractionAt", accessorKey: "lastInteractionAt", header: "Última interação", size: 120, cell: ({ getValue }) => { const v = getValue<string | null>(); const d = daysSince(v, now); return <span className={cn("tabular text-xs", heat(d))}>{v ? `${formatDate(v)} (${d}d)` : "—"}</span>; } },
      { id: "nextFollowUpAt", accessorKey: "nextFollowUpAt", header: "Próximo follow-up", size: 120, cell: ({ getValue }) => { const v = getValue<string | null>(); const due = v && new Date(v) <= now; return <span className={cn("tabular text-xs", due && "text-danger font-medium")}>{formatDate(v)}</span>; } },
      { id: "relationship", accessorKey: "relationship", header: "Relacionamento", size: 110, cell: ({ getValue }) => <span className="text-xs">{labelOf(RELATIONSHIP_OPTIONS, getValue<string>())}</span> },
      ...(kind === "contact"
        ? [
            {
              id: "contact",
              header: "Contato",
              size: 90,
              enableSorting: false,
              cell: ({ row }) => {
                const wa = whatsappLink(row.original.whatsapp ?? row.original.phone);
                return (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {row.original.email && (
                      <Button size="icon-sm" variant="ghost" asChild>
                        <a href={`mailto:${row.original.email}`} title="Enviar e-mail">
                          <Mail />
                        </a>
                      </Button>
                    )}
                    {wa && (
                      <Button size="icon-sm" variant="ghost" asChild>
                        <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp">
                          <MessageCircle />
                        </a>
                      </Button>
                    )}
                  </div>
                );
              },
            } as ColumnDef<OriginatorCrmRow, unknown>,
          ]
        : []),
    ],
    [kind, year, now],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        storageKey={storageKey}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(kind === "contact" ? `/originators/${r.id}` : `/companies/${r.id}`)}
        columnLabels={COLUMN_LABELS}
        defaultHidden={["onHold", "relationship"]}
        maxHeight="calc(100vh - 300px)"
        toolbarLeft={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="pl-8 h-8" />
            </div>
            <MultiSelect options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={cats} onChange={setCats} placeholder="Categoria" size="sm" />
            <MultiSelect options={RELATIONSHIP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={rels} onChange={setRels} placeholder="Relacionamento" size="sm" />
            <ToggleGroup type="single" value={only} onValueChange={(v) => v && setOnly(v)}>
              <ToggleGroupItem value="all">Todos</ToggleGroupItem>
              <ToggleGroupItem value="withCases">Com casos</ToggleGroupItem>
              <ToggleGroupItem value="year">{year}</ToggleGroupItem>
              <ToggleGroupItem value="active">Ativos</ToggleGroupItem>
              <ToggleGroupItem value="concluded">Concluíram</ToggleGroupItem>
              <ToggleGroupItem value="followup">Follow-up</ToggleGroupItem>
              <ToggleGroupItem value="cooling">Esfriando</ToggleGroupItem>
            </ToggleGroup>
            <span className="text-xs text-muted-foreground tabular">{data.length} registros</span>
          </div>
        }
        toolbarRight={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> {kind === "contact" ? "Novo originador" : "Nova empresa"}
          </Button>
        }
        renderMobileCard={(r) => (
          <div className="rounded-lg border bg-card p-3 shadow-card">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-sm">{r.name}</span>
              <Badge variant="muted">{labelOf(CATEGORY_OPTIONS, r.category)}</Badge>
            </div>
            {r.companyName && <div className="text-2xs text-muted-foreground">{r.companyName}</div>}
            <div className="mt-1 flex gap-3 text-2xs text-muted-foreground">
              <span>{r.casesTotal} casos</span>
              <span>{r.active} ativos</span>
              <span>{r.concluded} concluídos</span>
              <span>{r.volume ? formatMM(r.volume, { compact: true }) : ""}</span>
            </div>
          </div>
        )}
      />
      {kind === "contact" ? <ContactFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(c) => router.push(`/originators/${c.id}`)} /> : <CompanyFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(c) => router.push(`/companies/${c.id}`)} />}
    </>
  );
}
