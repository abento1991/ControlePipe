import { prisma } from "../db";
import { buildWhere, type OpportunityFilters } from "./filters";
import { COMPANY_CATEGORY_LABELS } from "../normalization/originators";
import { CATEGORY_LABELS, CHANNEL_LABELS } from "./dashboard";
import { monthLabel, monthKey } from "../utils";

export type ReportDimension = "month" | "year" | "type" | "typeCategory" | "status" | "company" | "contact" | "originatorCategory" | "assignee" | "channel" | "sector";

export interface ReportRow {
  key: string;
  label: string;
  received: number;
  active: number;
  onHold: number;
  concluded: number;
  declined: number;
  volume: number;
  avgTicket: number | null;
  conversion: number | null;
  share: number;
}

export interface ReportResult {
  dimension: ReportDimension;
  rows: ReportRow[];
  total: ReportRow;
  filters: OpportunityFilters;
}

export const DIMENSION_LABELS: Record<ReportDimension, string> = {
  month: "Mês de entrada",
  year: "Ano de entrada",
  type: "Tipo de operação",
  typeCategory: "Categoria do tipo",
  status: "Status",
  company: "Empresa originadora",
  contact: "Originador (pessoa)",
  originatorCategory: "Categoria do originador",
  assignee: "Responsável pela análise",
  channel: "Canal de entrada",
  sector: "Setor",
};

/** Aggregates the filtered opportunity set by one dimension. Always computed from the database. */
export async function runReport(dimension: ReportDimension, filters: OpportunityFilters): Promise<ReportResult> {
  const rows = await prisma.opportunity.findMany({
    where: buildWhere(filters),
    select: {
      entryDate: true,
      entryYear: true,
      amount: true,
      entryChannel: true,
      originatorCategory: true,
      sector: true,
      operationType: { select: { id: true, name: true, category: true } },
      status: { select: { key: true, name: true, group: true, outcome: true, sortOrder: true } },
      assignees: { select: { user: { select: { id: true, name: true } } } },
      originators: { where: { role: "PRIMARY" }, select: { company: { select: { id: true, name: true } }, contact: { select: { id: true, fullName: true } } } },
    },
  });
  const map = new Map<string, ReportRow & { withAmount: number; sort?: number }>();
  const total: ReportRow & { withAmount: number } = { key: "total", label: "Total", received: 0, active: 0, onHold: 0, concluded: 0, declined: 0, volume: 0, avgTicket: null, conversion: null, share: 1, withAmount: 0 };
  const add = (key: string, label: string, o: (typeof rows)[number], sort?: number) => {
    const cur = map.get(key) ?? { key, label, received: 0, active: 0, onHold: 0, concluded: 0, declined: 0, volume: 0, avgTicket: null, conversion: null, share: 0, withAmount: 0, sort };
    const amount = o.amount === null ? null : Number(o.amount);
    for (const t of [cur, total]) {
      t.received++;
      if (o.status.group === "ACTIVE") t.active++;
      if (o.status.group === "ON_HOLD") t.onHold++;
      if (o.status.group === "CONCLUDED") t.concluded++;
      if (o.status.outcome === "LOST") t.declined++;
      if (amount !== null) {
        t.volume += amount;
        t.withAmount++;
      }
    }
    map.set(key, cur);
  };
  for (const o of rows) {
    switch (dimension) {
      case "month": {
        if (!o.entryDate) add("none", "Sem data", o, 0);
        else {
          const k = monthKey(o.entryDate);
          add(k, monthLabel(k), o);
        }
        break;
      }
      case "year":
        add(String(o.entryYear ?? "none"), o.entryYear ? String(o.entryYear) : "Sem ano", o);
        break;
      case "type":
        add(o.operationType?.id ?? "none", o.operationType?.name ?? "Sem tipo", o);
        break;
      case "typeCategory":
        add(o.operationType?.category ?? "none", o.operationType ? CATEGORY_LABELS[o.operationType.category] : "Sem tipo", o);
        break;
      case "status":
        add(o.status.key, o.status.name, o, o.status.sortOrder);
        break;
      case "company": {
        const c = o.originators[0]?.company;
        add(c?.id ?? "none", c?.name ?? "Não identificada", o);
        break;
      }
      case "contact": {
        const c = o.originators[0]?.contact;
        add(c?.id ?? "none", c?.fullName ?? "Não identificado", o);
        break;
      }
      case "originatorCategory":
        add(o.originatorCategory ?? "none", o.originatorCategory ? COMPANY_CATEGORY_LABELS[o.originatorCategory as keyof typeof COMPANY_CATEGORY_LABELS] : "Não classificado", o);
        break;
      case "assignee":
        if (!o.assignees.length) add("none", "Sem responsável", o);
        for (const a of o.assignees) add(a.user.id, a.user.name, o);
        break;
      case "channel":
        add(o.entryChannel ?? "none", o.entryChannel ? CHANNEL_LABELS[o.entryChannel] : "Não informado", o);
        break;
      case "sector":
        add(o.sector ?? "none", o.sector ?? "Não informado", o);
        break;
    }
  }
  // for "assignee", total is double counted for multi-assignee rows: recompute from rows
  if (dimension === "assignee") {
    total.received = rows.length;
    total.active = rows.filter((r) => r.status.group === "ACTIVE").length;
    total.onHold = rows.filter((r) => r.status.group === "ON_HOLD").length;
    total.concluded = rows.filter((r) => r.status.group === "CONCLUDED").length;
    total.declined = rows.filter((r) => r.status.outcome === "LOST").length;
    total.volume = rows.reduce((n, r) => n + (r.amount === null ? 0 : Number(r.amount)), 0);
    total.withAmount = rows.filter((r) => r.amount !== null).length;
  }
  const finish = (r: ReportRow & { withAmount: number }): ReportRow => ({
    key: r.key,
    label: r.label,
    received: r.received,
    active: r.active,
    onHold: r.onHold,
    concluded: r.concluded,
    declined: r.declined,
    volume: r.volume,
    avgTicket: r.withAmount ? r.volume / r.withAmount : null,
    conversion: r.concluded + r.declined ? r.concluded / (r.concluded + r.declined) : null,
    share: total.received ? r.received / total.received : 0,
  });
  const out = [...map.values()];
  if (dimension === "month" || dimension === "year") out.sort((a, b) => a.key.localeCompare(b.key));
  else if (dimension === "status") out.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  else out.sort((a, b) => b.received - a.received || a.label.localeCompare(b.label));
  return { dimension, rows: out.map(finish), total: finish(total), filters };
}
