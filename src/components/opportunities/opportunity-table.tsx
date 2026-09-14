"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, RowSelectionState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Mail, MessageCircle, Phone, Users, PlayCircle, PauseCircle, XCircle } from "lucide-react";
import { DataTable, SelectCell, SelectHeader } from "@/components/data-table/data-table";
import { StatusCell, AssigneesCell, NextActionCell, FollowUpCell } from "./quick-edit-cells";
import { TextCell, TypeCell, ChannelCell, DateCell, AmountCell, OriginatorCell } from "./inline-cells";
import { HistoryCell, FeedbackCell } from "./history-cells";
import { TypeBadge, DaysBadge, StatusBadge } from "@/components/common/badges";
import { AssigneeAvatars } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useReference } from "@/components/layout/reference-context";
import { useUrlState } from "@/hooks/use-url-state";
import { bulkUpdateOpportunities, reactivateOpportunity } from "@/lib/actions/opportunities";
import { formatDate, formatMM, cn } from "@/lib/utils";
import { CHANNEL_LABELS } from "@/lib/queries/dashboard";
import type { OpportunityRowDTO } from "@/lib/queries/opportunities";

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = { EMAIL: Mail, WHATSAPP: MessageCircle, LIGACAO: Phone, REUNIAO: Users };

export const OPPORTUNITY_COLUMN_LABELS: Record<string, string> = {
  legacyId: "#",
  name: "Oportunidade",
  operationType: "Tipo",
  entryDate: "Entrada",
  daysInPipeline: "Dias",
  company: "Empresa originadora",
  contact: "Originador",
  entryChannel: "Canal",
  assignees: "Responsáveis",
  status: "Status",
  amount: "Valor (R$ mm)",
  nextAction: "Próxima ação",
  nextFollowUpAt: "Follow-up",
  updatedAt: "Atualizado",
  lastActivityAt: "Última atividade",
  exitDate: "Saída",
  sector: "Setor",
  originatorRaw: "Contato (planilha)",
  history: "Status da operação / atualizações",
  feedback: "Motivo / feedback",
};

export function buildColumns(opts: { quickEdit: boolean; showReactivate?: boolean }): ColumnDef<OpportunityRowDTO, unknown>[] {
  const cols: ColumnDef<OpportunityRowDTO, unknown>[] = [
    { id: "select", header: ({ table }) => <SelectHeader table={table} />, cell: ({ row }) => <SelectCell row={row} />, size: 32, enableSorting: false, enableResizing: false, enableHiding: false },
    { id: "legacyId", accessorKey: "legacyId", header: "#", size: 56, cell: ({ getValue }) => <span className="tabular text-2xs text-muted-foreground">{getValue<number | null>() ?? "—"}</span> },
    {
      id: "name",
      accessorKey: "name",
      header: "Oportunidade",
      size: 250,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {opts.quickEdit ? (
              <>
                <TextCell id={row.original.id} field="name" value={row.original.name} strong className="flex-1" />
                <Link href={`/opportunities/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-leto-green-deep hover:bg-muted" title="Abrir oportunidade">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <span className="font-medium truncate">{row.original.name}</span>
            )}
            {row.original.needsReview && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Registro com pendências de revisão (Data Quality)</TooltipContent>
              </Tooltip>
            )}
          </div>
          {(row.original.economicGroup || row.original.sector) && <div className="text-2xs text-muted-foreground truncate">{[row.original.economicGroup, row.original.sector].filter(Boolean).join(" · ")}</div>}
        </div>
      ),
    },
    { id: "operationType", accessorFn: (r) => r.operationType?.name ?? "", header: "Tipo", size: 145, cell: ({ row }) => (opts.quickEdit ? <TypeCell id={row.original.id} type={row.original.operationType} /> : <TypeBadge name={row.original.operationType?.name} color={row.original.operationType?.color} />) },
    { id: "entryDate", accessorKey: "entryDate", header: "Entrada", size: 90, cell: ({ row }) => (opts.quickEdit ? <DateCell id={row.original.id} field="entryDate" value={row.original.entryDate} /> : <span className="tabular text-xs">{formatDate(row.original.entryDate)}</span>) },
    { id: "daysInPipeline", accessorKey: "daysInPipeline", header: "Dias", size: 54, cell: ({ getValue }) => <DaysBadge days={getValue<number | null>()} /> },
    {
      id: "company",
      accessorFn: (r) => r.company?.name ?? "",
      header: "Empresa originadora",
      size: 150,
      cell: ({ row }) => (opts.quickEdit ? <OriginatorCell id={row.original.id} kind="company" company={row.original.company} contact={row.original.contact} rawText={row.original.originatorRaw} /> : row.original.company ? <span className="truncate block text-xs">{row.original.company.shortName ?? row.original.company.name}</span> : <span className="text-2xs text-muted-foreground truncate block">{row.original.contact ? "" : row.original.originatorRaw ?? "—"}</span>),
    },
    {
      id: "contact",
      accessorFn: (r) => r.contact?.fullName ?? "",
      header: "Originador",
      size: 140,
      cell: ({ row }) => (opts.quickEdit ? <OriginatorCell id={row.original.id} kind="contact" company={row.original.company} contact={row.original.contact} rawText={row.original.originatorRaw} /> : <span className={cn("truncate block text-xs", row.original.originatorNeedsReview && "text-warning")}>{row.original.contact?.fullName ?? ""}</span>),
    },
    {
      id: "entryChannel",
      accessorKey: "entryChannel",
      header: "Canal",
      size: 84,
      cell: ({ getValue, row }) => {
        const v = getValue<string | null>();
        if (opts.quickEdit) return <ChannelCell id={row.original.id} value={v} />;
        if (!v) return <span className="text-2xs text-muted-foreground">—</span>;
        const Icon = CHANNEL_ICON[v];
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            {Icon && <Icon className="h-3 w-3 text-muted-foreground" />} {CHANNEL_LABELS[v] ?? v}
          </span>
        );
      },
    },
    { id: "assignees", accessorFn: (r) => r.assignees.map((a) => a.name).join(", "), header: "Responsáveis", size: 104, enableSorting: false, cell: ({ row }) => (opts.quickEdit ? <AssigneesCell id={row.original.id} assignees={row.original.assignees} /> : <AssigneeAvatars users={row.original.assignees} />) },
    { id: "status", accessorFn: (r) => r.status.name, header: "Status", size: 138, cell: ({ row }) => (opts.quickEdit ? <StatusCell id={row.original.id} status={row.original.status} /> : <StatusBadge name={row.original.status.name} color={row.original.status.color} group={row.original.status.group} />) },
    {
      id: "history",
      accessorFn: (r) => r.lastUpdate?.text ?? r.legacyStatusText ?? "",
      header: "Status da operação / atualizações",
      size: 300,
      enableSorting: false,
      cell: ({ row }) => (opts.quickEdit ? <HistoryCell id={row.original.id} lastUpdate={row.original.lastUpdate} count={row.original.updatesCount} /> : <span className="text-xs block truncate" title={row.original.lastUpdate?.text ?? row.original.legacyStatusText ?? ""}>{row.original.lastUpdate ? `${formatDate(row.original.lastUpdate.date)} · ${row.original.lastUpdate.text}` : row.original.legacyStatusText ?? "—"}</span>),
    },
    {
      id: "feedback",
      accessorFn: (r) => r.closeReason ?? r.legacyFeedback ?? "",
      header: "Motivo / feedback",
      size: 220,
      enableSorting: false,
      cell: ({ row }) => <FeedbackCell id={row.original.id} closeReason={row.original.closeReason} legacyFeedback={row.original.legacyFeedback} declined={row.original.status.outcome === "LOST"} declineReason={row.original.declineReason} declinedBy={row.original.declinedBy} inferred={row.original.declineReasonInferred} />,
    },
    { id: "amount", accessorKey: "amount", header: "Valor (R$ mm)", size: 100, cell: ({ row }) => (opts.quickEdit ? <AmountCell id={row.original.id} value={row.original.amount} raw={row.original.amountRaw} /> : <span className="tabular text-xs">{row.original.amount !== null ? formatMM(row.original.amount) : row.original.amountRaw ? <span className="text-muted-foreground">{row.original.amountRaw}</span> : "—"}</span>) },
    { id: "nextAction", accessorKey: "nextAction", header: "Próxima ação", size: 180, enableSorting: false, cell: ({ row }) => (opts.quickEdit ? <NextActionCell id={row.original.id} value={row.original.nextAction} /> : <span className="text-xs truncate block">{row.original.nextAction ?? "—"}</span>) },
    { id: "nextFollowUpAt", accessorKey: "nextFollowUpAt", header: "Follow-up", size: 96, cell: ({ row }) => (opts.quickEdit ? <FollowUpCell id={row.original.id} value={row.original.nextFollowUpAt} /> : <span className="text-xs tabular">{formatDate(row.original.nextFollowUpAt)}</span>) },
    { id: "lastActivityAt", accessorKey: "lastActivityAt", header: "Última atividade", size: 110, cell: ({ getValue }) => <span className="tabular text-xs text-muted-foreground">{formatDate(getValue<string | null>())}</span> },
    { id: "updatedAt", accessorKey: "updatedAt", header: "Atualizado", size: 100, cell: ({ getValue }) => <span className="tabular text-xs text-muted-foreground">{formatDate(getValue<string>())}</span> },
    { id: "exitDate", accessorKey: "exitDate", header: "Saída", size: 92, cell: ({ getValue }) => <span className="tabular text-xs">{formatDate(getValue<string | null>())}</span> },
    { id: "sector", accessorKey: "sector", header: "Setor", size: 120, cell: ({ row }) => (opts.quickEdit ? <TextCell id={row.original.id} field="sector" value={row.original.sector} /> : <span className="text-xs truncate block">{row.original.sector ?? "—"}</span>) },
    { id: "originatorRaw", accessorKey: "originatorRaw", header: "Contato (planilha)", size: 160, enableSorting: false, cell: ({ getValue }) => <span className="text-2xs text-muted-foreground truncate block">{getValue<string | null>() ?? "—"}</span> },
  ];
  if (opts.showReactivate) {
    cols.push({
      id: "actions",
      header: "",
      size: 110,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      cell: ({ row }) => <ReactivateButton id={row.original.id} group={row.original.status.group} />,
    });
  }
  return cols;
}

function ReactivateButton({ id, group }: { id: string; group: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (group === "ACTIVE") return null;
  return (
    <Button
      size="xs"
      variant={group === "ON_HOLD" ? "accent" : "outline"}
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        start(async () => {
          const res = await reactivateOpportunity(id);
          if (!res.ok) toast.error(res.error);
          else {
            toast.success("Oportunidade reativada.");
            router.refresh();
          }
        });
      }}
    >
      <PlayCircle /> Reativar
    </Button>
  );
}

export function OpportunityTable({ rows, total, page, pageSize, storageKey, quickEdit = true, showReactivate = false, defaultHidden, exportBase, toolbarLeft }: { rows: OpportunityRowDTO[]; total: number; page: number; pageSize: number; storageKey: string; quickEdit?: boolean; showReactivate?: boolean; defaultHidden?: string[]; exportBase?: string; toolbarLeft?: React.ReactNode }) {
  const router = useRouter();
  const { sp, set, replaceAll } = useUrlState();
  const ref = useReference();
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  const [pending, start] = React.useTransition();
  const columns = React.useMemo(() => buildColumns({ quickEdit, showReactivate }), [quickEdit, showReactivate]);
  const sortId = sp.get("sort") ?? "entryDate";
  const sortDesc = (sp.get("dir") ?? "desc") === "desc";
  const sorting: SortingState = [{ id: sortId, desc: sortDesc }];
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  function bulk(input: Parameters<typeof bulkUpdateOpportunities>[1], label: string) {
    start(async () => {
      const res = await bulkUpdateOpportunities(selectedIds, input);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`${res.data.count} oportunidades: ${label}`);
        setSelected({});
        router.refresh();
      }
    });
  }

  const columnFilterValues = React.useMemo(() => {
    const v: Record<string, string> = {};
    sp.forEach((val, key) => {
      if (key.startsWith("cf_")) v[key.slice(3)] = val;
    });
    return v;
  }, [sp]);
  const filterPlaceholders: Record<string, string> = { entryDate: "2026-08 · 15/08/2026", daysInPipeline: ">30", amount: ">10 · 5-20", nextFollowUpAt: "2026-09", lastActivityAt: "2026-09", updatedAt: "2026-09", exitDate: "2025", legacyId: "#" };

  const exportHref = (format: "csv" | "xlsx") => {
    const p = new URLSearchParams(sp.toString());
    p.set("format", format);
    return `/api/export?${p.toString()}${exportBase ? `&base=${exportBase}` : ""}`;
  };

  return (
    <DataTable
      columns={columns}
      data={rows}
      storageKey={storageKey}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(`/opportunities/${r.id}`)}
      sorting={sorting}
      onSortingChange={(s) => set({ sort: s[0]?.id ?? null, dir: s[0] ? (s[0].desc ? "desc" : "asc") : null }, { resetPage: false })}
      pagination={total > pageSize ? { page, pageSize, total, onPageChange: (p) => set({ page: String(p) }, { resetPage: false }), onPageSizeChange: (s) => set({ pageSize: String(s) }) } : undefined}
      footer={<span className="text-xs text-muted-foreground tabular">{total.toLocaleString("pt-BR")} registros · tabela única, sem páginas</span>}
      selection={{ selected, onChange: setSelected }}
      exportHref={exportHref}
      columnLabels={OPPORTUNITY_COLUMN_LABELS}
      stickyColumns={2}
      columnFilters={{
        mode: "server",
        values: columnFilterValues,
        onChange: (id, value) => set({ [`cf_${id}`]: value || null }),
        onClearAll: () => {
          const next = new URLSearchParams(sp.toString());
          Array.from(next.keys()).filter((k) => k.startsWith("cf_") || k === "page").forEach((k) => next.delete(k));
          replaceAll(next);
        },
        placeholders: filterPlaceholders,
      }}
      defaultHidden={defaultHidden ?? ["legacyId", "updatedAt", "exitDate", "sector", "originatorRaw", "lastActivityAt", "feedback"]}
      toolbarLeft={
        <div className="flex items-center gap-2 flex-wrap">
          {toolbarLeft}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border bg-leto-green-faint px-2 py-1 text-xs animate-fade-in">
              <span className="font-medium">{selectedIds.length} selecionadas</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="xs" variant="outline" disabled={pending}>
                    Alterar status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {ref.statuses.filter((s) => s.group !== "LEGACY").map((s) => (
                    <DropdownMenuItem key={s.key} onSelect={() => bulk({ statusKey: s.key }, s.name)}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color ?? "#999" }} /> {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="xs" variant="outline" disabled={pending}>
                    Adicionar responsável
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Adicionar aos selecionados</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ref.users.map((u) => (
                    <DropdownMenuItem key={u.id} onSelect={() => bulk({ addAssigneeIds: [u.id] }, `+ ${u.name}`)}>
                      {u.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="xs" variant="outline" disabled={pending} onClick={() => bulk({ statusKey: "ON_HOLD" }, "On Hold")}>
                <PauseCircle /> On Hold
              </Button>
              <Button size="xs" variant="outline" disabled={pending} onClick={() => bulk({ statusKey: "DECLINED" }, "Declinada")}>
                <XCircle /> Declinar
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected({})}>
                Limpar
              </Button>
            </div>
          )}
        </div>
      }
      renderMobileCard={(r) => (
        <div className="rounded-lg border bg-card p-3 shadow-card space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm">{r.name}</span>
            <StatusBadge name={r.status.name} color={r.status.color} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
            <TypeBadge name={r.operationType?.name} color={r.operationType?.color} />
            <span>{formatDate(r.entryDate)}</span>
            <DaysBadge days={r.daysInPipeline} />
            {r.amount !== null && <span>{formatMM(r.amount)}</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xs truncate">{r.company?.name ?? r.contact?.fullName ?? r.originatorRaw ?? "—"}</span>
            <AssigneeAvatars users={r.assignees} />
          </div>
          {r.nextAction && <div className="text-2xs">→ {r.nextAction}</div>}
        </div>
      )}
    />
  );
}
