"use client";

import * as React from "react";
import { Copy, Download, FileSpreadsheet, Table2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUrlState } from "@/hooks/use-url-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartCard } from "@/components/charts/chart-card";
import { Columns, HorizontalBars, MonthlySeries } from "@/components/charts/charts";
import { KpiCard } from "@/components/common/kpi-card";
import { DIMENSION_LABELS, type ReportDimension, type ReportResult } from "@/lib/queries/reports";
import { cn, formatInt, formatMM, formatPct } from "@/lib/utils";

const QUESTIONS: { label: string; params: Record<string, string> }[] = [
  { label: "Quantos casos recebemos por mês?", params: { dim: "month" } },
  { label: `Casos recebidos em ${new Date().getFullYear()} por tipo`, params: { dim: "type", years: String(new Date().getFullYear()) } },
  { label: "Quantos eram precatórios?", params: { dim: "typeCategory", typeCategories: "PRECATORIO_FEDERAL,PRECATORIO_ESTADUAL,PRECATORIO_MUNICIPAL,PRE_PRECATORIO" } },
  { label: "Quantos eram NPL?", params: { dim: "year", typeCategories: "NPL" } },
  { label: "Quantos eram crédito estruturado?", params: { dim: "year", typeCategories: "CREDITO_ESTRUTURADO" } },
  { label: "Quais empresas mais trouxeram casos?", params: { dim: "company" } },
  { label: "Quem originou cada oportunidade?", params: { dim: "contact" } },
  { label: "Quais responsáveis analisaram mais?", params: { dim: "assignee" } },
  { label: "Quantos chegaram por e-mail?", params: { dim: "channel" } },
  { label: "Conversão por originador", params: { dim: "contact", sortBy: "conversion" } },
  { label: "Conversão por tipo de operação", params: { dim: "typeCategory", sortBy: "conversion" } },
  { label: "Quantos casos concluímos no ano?", params: { dim: "year", statusKeys: "CONCLUDED" } },
];

type SortKey = "received" | "active" | "concluded" | "declined" | "volume" | "conversion" | "label";

export function ReportsView({ result, metric, sortBy }: { result: ReportResult; metric: string; sortBy: string }) {
  const { set, sp } = useUrlState();
  const [view, setView] = React.useState<"table" | "chart">("table");
  const dim = result.dimension;
  const valueKey = (metric || "received") as "received" | "concluded" | "volume" | "active";
  const sortKey = (sortBy || (dim === "month" || dim === "year" || dim === "status" ? "label" : "received")) as SortKey;

  const rows = React.useMemo(() => {
    const r = [...result.rows];
    if (sortKey === "label") return r;
    return r.sort((a, b) => {
      const av = a[sortKey] ?? -1;
      const bv = b[sortKey] ?? -1;
      return (bv as number) - (av as number);
    });
  }, [result.rows, sortKey]);

  const periodLabel = result.filters.years?.length ? result.filters.years.join(", ") : result.filters.from || result.filters.to ? `${result.filters.from ?? "…"} → ${result.filters.to ?? "…"}` : "Todo o histórico";
  const title = `${DIMENSION_LABELS[dim]} — ${valueKey === "received" ? "casos recebidos" : valueKey === "concluded" ? "concluídos" : valueKey === "active" ? "ativos" : "volume (R$ mm)"}`;

  function tableData() {
    return rows.map((r) => ({ [DIMENSION_LABELS[dim]]: r.label, Recebidas: r.received, Ativas: r.active, "On Hold": r.onHold, Concluídas: r.concluded, Declinadas: r.declined, "Conversão": r.conversion === null ? "" : Math.round(r.conversion * 1000) / 10, "Volume (R$ mm)": Math.round(r.volume * 100) / 100, "Ticket médio (R$ mm)": r.avgTicket === null ? "" : Math.round(r.avgTicket * 100) / 100, "Participação (%)": Math.round(r.share * 1000) / 10 }));
  }
  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(tableData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `leto-relatorio-${dim}.xlsx`);
  }
  function exportCsv() {
    const ws = XLSX.utils.json_to_sheet(tableData());
    const csv = "﻿" + XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `leto-relatorio-${dim}.csv`;
    a.click();
  }
  function copyTable() {
    const data = tableData();
    const header = Object.keys(data[0] ?? {}).join("\t");
    const lines = data.map((r) => Object.values(r).join("\t"));
    navigator.clipboard.writeText([header, ...lines].join("\n")).then(() => toast.success("Tabela copiada."));
  }

  const t = result.total;
  const chartRows = rows.filter((r) => r.key !== "none" || rows.length <= 3).slice(0, dim === "month" ? 36 : 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {QUESTIONS.map((q) => {
          const active = Object.entries(q.params).every(([k, v]) => sp.get(k) === v);
          return (
            <button key={q.label} onClick={() => set({ ...Object.fromEntries(["dim", "years", "typeCategories", "statusKeys", "sortBy"].map((k) => [k, null])), ...q.params })} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", active ? "bg-leto-ink text-white border-leto-ink" : "bg-card hover:bg-muted")}>
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Recebidas" value={formatInt(t.received)} accent="green" />
        <KpiCard label="Ativas" value={formatInt(t.active)} />
        <KpiCard label="On Hold" value={formatInt(t.onHold)} />
        <KpiCard label="Concluídas" value={formatInt(t.concluded)} hint={`Conversão ${formatPct(t.conversion)}`} accent="blue" />
        <KpiCard label="Declinadas" value={formatInt(t.declined)} />
        <KpiCard label="Volume informado" value={formatMM(t.volume, { compact: true })} hint={`Ticket médio ${formatMM(t.avgTicket)}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Agrupar por</span>
        <Select value={dim} onValueChange={(v) => set({ dim: v, sortBy: null })}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(DIMENSION_LABELS) as ReportDimension[]).map((d) => (
              <SelectItem key={d} value={d}>
                {DIMENSION_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Métrica do gráfico</span>
        <Select value={valueKey} onValueChange={(v) => set({ metric: v })}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="received">Casos recebidos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="concluded">Concluídos</SelectItem>
            <SelectItem value="volume">Volume (R$ mm)</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Ordenar</span>
        <Select value={sortKey} onValueChange={(v) => set({ sortBy: v })}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="label">Natural</SelectItem>
            <SelectItem value="received">Recebidas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="concluded">Concluídas</SelectItem>
            <SelectItem value="declined">Declinadas</SelectItem>
            <SelectItem value="conversion">Conversão</SelectItem>
            <SelectItem value="volume">Volume</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1.5">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "table" | "chart")}>
            <ToggleGroupItem value="table">
              <Table2 className="h-3.5 w-3.5 mr-1" /> Tabela
            </ToggleGroupItem>
            <ToggleGroupItem value="chart">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Gráfico
            </ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportXlsx}>
            <FileSpreadsheet /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={copyTable}>
            <Copy /> Copiar tabela
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-lg border bg-card shadow-card overflow-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 380px)" }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card text-2xs uppercase tracking-wide text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
              <tr>
                <th className="text-left px-3 py-2">{DIMENSION_LABELS[dim]}</th>
                <th className="text-right px-3 py-2">Recebidas</th>
                <th className="text-right px-3 py-2">%</th>
                <th className="text-right px-3 py-2">Ativas</th>
                <th className="text-right px-3 py-2">On Hold</th>
                <th className="text-right px-3 py-2">Concluídas</th>
                <th className="text-right px-3 py-2">Declinadas</th>
                <th className="text-right px-3 py-2">Conversão</th>
                <th className="text-right px-3 py-2">Volume (R$ mm)</th>
                <th className="text-right px-3 py-2">Ticket médio</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-leto-green-faint">
                  <td className="px-3 py-1.5 font-medium">{r.label}</td>
                  <td className="px-3 py-1.5 text-right">{formatInt(r.received)}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{formatPct(r.share, 0)}</td>
                  <td className="px-3 py-1.5 text-right">{formatInt(r.active)}</td>
                  <td className="px-3 py-1.5 text-right">{formatInt(r.onHold)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{formatInt(r.concluded)}</td>
                  <td className="px-3 py-1.5 text-right">{formatInt(r.declined)}</td>
                  <td className="px-3 py-1.5 text-right">{formatPct(r.conversion, 0)}</td>
                  <td className="px-3 py-1.5 text-right">{r.volume ? formatMM(r.volume) : "—"}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{formatMM(r.avgTicket)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-muted/70 font-semibold tabular">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{formatInt(t.received)}</td>
                <td className="px-3 py-2 text-right">100%</td>
                <td className="px-3 py-2 text-right">{formatInt(t.active)}</td>
                <td className="px-3 py-2 text-right">{formatInt(t.onHold)}</td>
                <td className="px-3 py-2 text-right">{formatInt(t.concluded)}</td>
                <td className="px-3 py-2 text-right">{formatInt(t.declined)}</td>
                <td className="px-3 py-2 text-right">{formatPct(t.conversion, 0)}</td>
                <td className="px-3 py-2 text-right">{formatMM(t.volume)}</td>
                <td className="px-3 py-2 text-right">{formatMM(t.avgTicket)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <ChartCard title={title} period={periodLabel} height={dim === "month" ? 360 : Math.max(280, Math.min(640, chartRows.length * 28 + 40))} highlights={[{ label: "Recebidas", value: formatInt(t.received) }, { label: "Concluídas", value: formatInt(t.concluded) }, { label: "Conversão", value: formatPct(t.conversion, 0) }]}>
          {dim === "month" ? <MonthlySeries data={chartRows.map((r) => ({ label: r.label, count: r[valueKey] as number, concluded: r.concluded }))} secondaryKey="concluded" /> : dim === "year" || dim === "status" ? <Columns data={chartRows.map((r) => ({ label: r.label, count: r[valueKey] })) as Record<string, unknown>[]} formatter={valueKey === "volume" ? (v) => formatMM(v, { compact: true }) : undefined} /> : <HorizontalBars data={chartRows.map((r) => ({ label: r.label, count: r[valueKey] })) as Record<string, unknown>[]} formatter={valueKey === "volume" ? (v) => formatMM(v, { compact: true }) : undefined} />}
        </ChartCard>
      )}
    </div>
  );
}
