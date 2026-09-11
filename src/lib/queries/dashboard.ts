import { prisma } from "../db";
import { buildWhere, type OpportunityFilters } from "./filters";
import { AGING_BUCKETS, agingBucket, monthKey } from "../utils";
import { COMPANY_CATEGORY_LABELS } from "../normalization/originators";
import { detectMilestones } from "../normalization/legacy-timeline";

export interface KPI {
  receivedYear: number;
  receivedMonth: number;
  active: number;
  onHold: number;
  concluded: number;
  declined: number;
  totalVolume: number;
  activeVolume: number;
  avgTicket: number | null;
  conversionRate: number | null;
  avgDaysInPipeline: number | null;
  total: number;
  withAmount: number;
}

export interface NamedCount {
  key: string;
  label: string;
  count: number;
  volume?: number;
  concluded?: number;
  active?: number;
  color?: string | null;
}

export interface DashboardData {
  kpi: KPI;
  byMonth: { key: string; count: number; volume: number; concluded: number }[];
  byType: NamedCount[];
  byTypeCategory: NamedCount[];
  byCompany: NamedCount[];
  byContact: NamedCount[];
  byOriginatorCategory: NamedCount[];
  byAssignee: NamedCount[];
  byChannel: NamedCount[];
  byStatus: NamedCount[];
  byYear: NamedCount[];
  aging: NamedCount[];
  funnel: { stage: string; count: number; note?: string }[];
  filters: OpportunityFilters;
  generatedAt: string;
}

const CHANNEL_LABELS: Record<string, string> = { EMAIL: "E-mail", WHATSAPP: "WhatsApp", LIGACAO: "Ligação", REUNIAO: "Reunião", INDICACAO: "Indicação", ORIGINACAO_PROPRIA: "Originação própria", OUTRO: "Outro" };
export const CATEGORY_LABELS: Record<string, string> = {
  CREDITO_ESTRUTURADO: "Crédito Estruturado",
  DIP_EXIT_FINANCING: "DIP / Exit Financing",
  NPL: "NPL",
  LEGAL_CLAIM: "Legal Claim",
  LITIGATION_FINANCE: "Litigation Finance",
  PRECATORIO_FEDERAL: "Precatório Federal",
  PRECATORIO_ESTADUAL: "Precatório Estadual",
  PRECATORIO_MUNICIPAL: "Precatório Municipal",
  PRE_PRECATORIO: "Pré-Precatório",
  DIREITOS_CREDITORIOS: "Direitos Creditórios",
  FIDC: "FIDC",
  ANTECIPACAO_RECEBIVEIS: "Antecipação de Recebíveis",
  FALENCIA_DISTRESSED: "Falência / Distressed",
  OUTROS: "Outros",
};
export { CHANNEL_LABELS };

function bump(map: Map<string, NamedCount>, key: string, label: string, amount: number | null, isConcluded: boolean, isActive: boolean, color?: string | null) {
  const cur = map.get(key) ?? { key, label, count: 0, volume: 0, concluded: 0, active: 0, color };
  cur.count++;
  cur.volume = (cur.volume ?? 0) + (amount ?? 0);
  if (isConcluded) cur.concluded = (cur.concluded ?? 0) + 1;
  if (isActive) cur.active = (cur.active ?? 0) + 1;
  map.set(key, cur);
}

function sorted(map: Map<string, NamedCount>, limit?: number): NamedCount[] {
  const arr = [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return limit ? arr.slice(0, limit) : arr;
}

/**
 * All indicators are computed from the database on every request (never from the workbook summary cells).
 * The filtered set is loaded with a narrow projection and aggregated in memory: at the current scale
 * (~1k rows, tens of thousands would still be fine) this is faster than a dozen separate groupBy queries.
 */
export async function getDashboardData(filters: OpportunityFilters, now: Date = new Date()): Promise<DashboardData> {
  const where = buildWhere(filters, now);
  const rows = await prisma.opportunity.findMany({
    where,
    select: {
      id: true,
      entryDate: true,
      entryYear: true,
      exitDate: true,
      amount: true,
      entryChannel: true,
      originatorCategory: true,
      lastActivityAt: true,
      updatedAt: true,
      legacyStatusText: true,
      operationType: { select: { id: true, name: true, category: true, color: true } },
      status: { select: { key: true, name: true, group: true, outcome: true, color: true, sortOrder: true } },
      assignees: { select: { user: { select: { id: true, name: true, color: true } } } },
      originators: { where: { role: "PRIMARY" }, select: { company: { select: { id: true, name: true } }, contact: { select: { id: true, fullName: true } } } },
      activities: { where: { type: { in: ["PROPOSAL_SENT", "LEGACY_STATUS"] } }, select: { type: true, body: true } },
    },
  });

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const kpi: KPI = { receivedYear: 0, receivedMonth: 0, active: 0, onHold: 0, concluded: 0, declined: 0, totalVolume: 0, activeVolume: 0, avgTicket: null, conversionRate: null, avgDaysInPipeline: null, total: rows.length, withAmount: 0 };
  const byMonth = new Map<string, { key: string; count: number; volume: number; concluded: number }>();
  const byType = new Map<string, NamedCount>();
  const byTypeCategory = new Map<string, NamedCount>();
  const byCompany = new Map<string, NamedCount>();
  const byContact = new Map<string, NamedCount>();
  const byOriginatorCategory = new Map<string, NamedCount>();
  const byAssignee = new Map<string, NamedCount>();
  const byChannel = new Map<string, NamedCount>();
  const byStatus = new Map<string, NamedCount>();
  const byYear = new Map<string, NamedCount>();
  const aging = new Map<string, NamedCount>();
  for (const b of AGING_BUCKETS) aging.set(b, { key: b, label: `${b} dias`, count: 0, volume: 0 });
  let daysSum = 0;
  let daysN = 0;
  let proposals = 0;
  let deep = 0;
  let decided = 0;

  for (const o of rows) {
    const amount = o.amount === null ? null : Number(o.amount);
    const isConcluded = o.status.group === "CONCLUDED";
    const isActive = o.status.group === "ACTIVE";
    const isOpen = isActive || o.status.group === "ON_HOLD" || o.status.group === "LEGACY";
    if (o.entryDate) {
      if (o.entryDate.getUTCFullYear() === year) kpi.receivedYear++;
      if (o.entryDate.getUTCFullYear() === year && o.entryDate.getUTCMonth() === month) kpi.receivedMonth++;
      const mk = monthKey(o.entryDate);
      const m = byMonth.get(mk) ?? { key: mk, count: 0, volume: 0, concluded: 0 };
      m.count++;
      m.volume += amount ?? 0;
      if (isConcluded) m.concluded++;
      byMonth.set(mk, m);
      const end = isOpen ? now : o.exitDate ?? o.lastActivityAt ?? o.updatedAt;
      const days = Math.max(0, Math.floor((end.getTime() - o.entryDate.getTime()) / 86400000));
      daysSum += days;
      daysN++;
      if (isActive) {
        const b = agingBucket(days);
        const a = aging.get(b);
        if (a) {
          a.count++;
          a.volume = (a.volume ?? 0) + (amount ?? 0);
        }
      }
    }
    if (isActive) kpi.active++;
    if (o.status.group === "ON_HOLD") kpi.onHold++;
    if (isConcluded) kpi.concluded++;
    if (o.status.outcome === "LOST") kpi.declined++;
    if (o.status.group === "CONCLUDED" || o.status.group === "CLOSED") decided++;
    if (amount !== null) {
      kpi.totalVolume += amount;
      kpi.withAmount++;
      if (isActive) kpi.activeVolume += amount;
    }
    bump(byType, o.operationType?.id ?? "none", o.operationType?.name ?? "Sem tipo", amount, isConcluded, isActive, o.operationType?.color);
    bump(byTypeCategory, o.operationType?.category ?? "none", CATEGORY_LABELS[o.operationType?.category ?? ""] ?? "Sem tipo", amount, isConcluded, isActive);
    const prim = o.originators[0];
    if (prim?.company) bump(byCompany, prim.company.id, prim.company.name, amount, isConcluded, isActive);
    if (prim?.contact) bump(byContact, prim.contact.id, prim.contact.fullName, amount, isConcluded, isActive);
    bump(byOriginatorCategory, o.originatorCategory ?? "none", o.originatorCategory ? COMPANY_CATEGORY_LABELS[o.originatorCategory as keyof typeof COMPANY_CATEGORY_LABELS] : "Não classificado", amount, isConcluded, isActive);
    for (const a of o.assignees) bump(byAssignee, a.user.id, a.user.name, amount, isConcluded, isActive, a.user.color);
    if (!o.assignees.length) bump(byAssignee, "none", "Sem responsável", amount, isConcluded, isActive);
    bump(byChannel, o.entryChannel ?? "none", o.entryChannel ? CHANNEL_LABELS[o.entryChannel] : "Não informado", amount, isConcluded, isActive);
    bump(byStatus, o.status.key, o.status.name, amount, isConcluded, isActive, o.status.color);
    bump(byYear, String(o.entryYear ?? "—"), String(o.entryYear ?? "Sem ano"), amount, isConcluded, isActive);
    // Funnel from available evidence: proposals (explicit activity or legacy text), deep analysis (legacy keywords)
    const texts = o.activities.map((a) => (a.type === "PROPOSAL_SENT" ? "proposta enviada" : a.body ?? ""));
    const joined = texts.join("\n").toLowerCase();
    const ms = detectMilestones(joined + "\n" + (o.legacyStatusText ?? "").toLowerCase());
    if (ms.proposalSent || isConcluded) proposals++;
    if (ms.deepAnalysis || ms.proposalSent || isConcluded) deep++;
  }

  kpi.avgTicket = kpi.withAmount ? kpi.totalVolume / kpi.withAmount : null;
  kpi.conversionRate = decided ? kpi.concluded / decided : null;
  kpi.avgDaysInPipeline = daysN ? daysSum / daysN : null;

  const statusOrder = new Map(rows.map((r) => [r.status.key, r.status.sortOrder]));
  const preAnalysed = rows.filter((r) => r.status.group !== "LEGACY" && (r.legacyStatusText || r.status.group !== "CLOSED" || r.exitDate)).length;

  return {
    kpi,
    byMonth: [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key)),
    byType: sorted(byType),
    byTypeCategory: sorted(byTypeCategory),
    byCompany: sorted(byCompany, 15),
    byContact: sorted(byContact, 15),
    byOriginatorCategory: sorted(byOriginatorCategory),
    byAssignee: sorted(byAssignee),
    byChannel: sorted(byChannel),
    byStatus: [...byStatus.values()].sort((a, b) => (statusOrder.get(a.key) ?? 0) - (statusOrder.get(b.key) ?? 0)),
    byYear: [...byYear.values()].sort((a, b) => a.key.localeCompare(b.key)),
    aging: [...aging.values()],
    funnel: [
      { stage: "Recebido", count: rows.length },
      { stage: "Pré-analisado", count: preAnalysed, note: "Com registro de análise/decisão" },
      { stage: "Análise aprofundada", count: deep, note: "Evidência de data room, modelo, precificação ou comitê no histórico" },
      { stage: "Proposta enviada", count: proposals, note: "Atividade de proposta ou menção no histórico" },
      { stage: "Concluído", count: kpi.concluded },
    ],
    filters,
    generatedAt: now.toISOString(),
  };
}

export interface AttentionItem {
  id: string;
  name: string;
  statusName: string;
  statusColor: string | null;
  reason: string;
  days: number | null;
  nextFollowUpAt: string | null;
  nextAction: string | null;
}

export async function getPersonalDashboard(userId: string, now: Date = new Date()) {
  const staleCutoff = new Date(now.getTime() - 30 * 86400000);
  const waitingCutoff = new Date(now.getTime() - 15 * 86400000);
  const [mine, attentionRows, followUps] = await Promise.all([
    prisma.opportunity.findMany({
      where: { isDeleted: false, status: { group: { in: ["ACTIVE", "ON_HOLD"] } }, assignees: { some: { userId } } },
      select: { id: true, name: true, entryDate: true, amount: true, nextAction: true, nextFollowUpAt: true, lastActivityAt: true, updatedAt: true, status: { select: { name: true, color: true, group: true } }, operationType: { select: { name: true } } },
      orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 50,
    }),
    prisma.opportunity.findMany({
      where: {
        isDeleted: false,
        status: { group: "ACTIVE" },
        OR: [
          { nextFollowUpAt: { lt: now } },
          { AND: [{ OR: [{ nextAction: null }, { nextAction: "" }] }] },
          { OR: [{ lastActivityAt: { lt: staleCutoff } }, { lastActivityAt: null, updatedAt: { lt: staleCutoff } }] },
          { status: { key: "WAITING_INFO" }, OR: [{ lastActivityAt: { lt: waitingCutoff } }, { lastActivityAt: null, updatedAt: { lt: waitingCutoff } }] },
        ],
      },
      select: { id: true, name: true, nextAction: true, nextFollowUpAt: true, lastActivityAt: true, updatedAt: true, status: { select: { key: true, name: true, color: true } }, assignees: { select: { userId: true } } },
      orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { lastActivityAt: { sort: "asc", nulls: "first" } }],
      take: 200,
    }),
    prisma.opportunity.findMany({
      where: { isDeleted: false, nextFollowUpAt: { not: null }, status: { group: { in: ["ACTIVE", "ON_HOLD"] } } },
      select: { id: true, name: true, nextAction: true, nextFollowUpAt: true, status: { select: { name: true, color: true } }, assignees: { select: { user: { select: { id: true, name: true, initials: true, color: true } } } } },
      orderBy: { nextFollowUpAt: "asc" },
      take: 30,
    }),
  ]);

  const attention: AttentionItem[] = attentionRows.map((o) => {
    const last = o.lastActivityAt ?? o.updatedAt;
    const days = Math.floor((now.getTime() - last.getTime()) / 86400000);
    let reason = "";
    if (o.nextFollowUpAt && o.nextFollowUpAt < now) reason = "Follow-up vencido";
    else if (o.status.key === "WAITING_INFO" && last < waitingCutoff) reason = `Aguardando informação há ${days} dias`;
    else if (!o.nextAction) reason = "Sem próxima ação definida";
    else reason = `Sem atualização há ${days} dias`;
    return { id: o.id, name: o.name, statusName: o.status.name, statusColor: o.status.color, reason, days, nextFollowUpAt: o.nextFollowUpAt?.toISOString() ?? null, nextAction: o.nextAction };
  });
  const mineIds = new Set(mine.map((m) => m.id));
  const attentionMine = attention.filter((a) => mineIds.has(a.id));
  const attentionOthers = attention.filter((a) => !mineIds.has(a.id));

  return {
    mine: mine.map((m) => ({ ...m, amount: m.amount === null ? null : Number(m.amount), entryDate: m.entryDate?.toISOString() ?? null, nextFollowUpAt: m.nextFollowUpAt?.toISOString() ?? null, lastActivityAt: m.lastActivityAt?.toISOString() ?? null, updatedAt: m.updatedAt.toISOString() })),
    attention: [...attentionMine, ...attentionOthers].slice(0, 40),
    attentionCount: attention.length,
    followUps: followUps.map((f) => ({ ...f, nextFollowUpAt: f.nextFollowUpAt!.toISOString(), assignees: f.assignees.map((a) => a.user) })),
  };
}

export type PersonalDashboard = Awaited<ReturnType<typeof getPersonalDashboard>>;
