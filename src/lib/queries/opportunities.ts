import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { buildWhere, type ListParams } from "./filters";

export const opportunityListSelect = {
  id: true,
  legacyId: true,
  name: true,
  economicGroup: true,
  sector: true,
  entryDate: true,
  entryYear: true,
  exitDate: true,
  amount: true,
  amountRaw: true,
  entryChannel: true,
  nextAction: true,
  nextFollowUpAt: true,
  lastActivityAt: true,
  updatedAt: true,
  needsReview: true,
  originatorRaw: true,
  originatorCategory: true,
  operationTypeRaw: true,
  assigneesRaw: true,
  operationType: { select: { id: true, name: true, color: true, category: true } },
  status: { select: { id: true, key: true, name: true, group: true, outcome: true, color: true } },
  assignees: { select: { isPrimary: true, user: { select: { id: true, name: true, initials: true, color: true, isArchived: true } } } },
  originators: { where: { role: "PRIMARY" as const }, select: { company: { select: { id: true, name: true, shortName: true, category: true } }, contact: { select: { id: true, fullName: true } }, needsReview: true } },
} satisfies Prisma.OpportunitySelect;

export type OpportunityListRow = Prisma.OpportunityGetPayload<{ select: typeof opportunityListSelect }>;

/** Serializable row for client tables. */
export interface OpportunityRowDTO {
  id: string;
  legacyId: number | null;
  name: string;
  economicGroup: string | null;
  sector: string | null;
  entryDate: string | null;
  entryYear: number | null;
  exitDate: string | null;
  daysInPipeline: number | null;
  amount: number | null;
  amountRaw: string | null;
  entryChannel: string | null;
  nextAction: string | null;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  updatedAt: string;
  needsReview: boolean;
  originatorRaw: string | null;
  originatorCategory: string | null;
  operationTypeRaw: string | null;
  assigneesRaw: string | null;
  operationType: { id: string; name: string; color: string | null; category: string } | null;
  status: { id: string; key: string; name: string; group: string; outcome: string; color: string | null };
  assignees: { id: string; name: string; initials: string | null; color: string | null; isArchived: boolean; isPrimary: boolean }[];
  company: { id: string; name: string; shortName: string | null; category: string } | null;
  contact: { id: string; fullName: string } | null;
  originatorNeedsReview: boolean;
}

export function toRowDTO(o: OpportunityListRow, now: Date = new Date()): OpportunityRowDTO {
  const isOpen = o.status.group === "ACTIVE" || o.status.group === "ON_HOLD" || o.status.group === "LEGACY";
  const end = isOpen ? now : o.exitDate ?? o.lastActivityAt ?? o.updatedAt;
  const days = o.entryDate ? Math.max(0, Math.floor((end.getTime() - o.entryDate.getTime()) / 86400000)) : null;
  const primary = o.originators[0];
  return {
    id: o.id,
    legacyId: o.legacyId,
    name: o.name,
    economicGroup: o.economicGroup,
    sector: o.sector,
    entryDate: o.entryDate?.toISOString() ?? null,
    entryYear: o.entryYear,
    exitDate: o.exitDate?.toISOString() ?? null,
    daysInPipeline: days,
    amount: o.amount === null ? null : Number(o.amount),
    amountRaw: o.amountRaw,
    entryChannel: o.entryChannel,
    nextAction: o.nextAction,
    nextFollowUpAt: o.nextFollowUpAt?.toISOString() ?? null,
    lastActivityAt: o.lastActivityAt?.toISOString() ?? null,
    updatedAt: o.updatedAt.toISOString(),
    needsReview: o.needsReview,
    originatorRaw: o.originatorRaw,
    originatorCategory: o.originatorCategory,
    operationTypeRaw: o.operationTypeRaw,
    assigneesRaw: o.assigneesRaw,
    operationType: o.operationType,
    status: o.status,
    assignees: o.assignees.map((a) => ({ ...a.user, isPrimary: a.isPrimary })),
    company: primary?.company ?? null,
    contact: primary?.contact ?? null,
    originatorNeedsReview: primary?.needsReview ?? false,
  };
}

const SORT_MAP: Record<string, (desc: boolean) => Prisma.OpportunityOrderByWithRelationInput | Prisma.OpportunityOrderByWithRelationInput[]> = {
  name: (d) => ({ name: d ? "desc" : "asc" }),
  legacyId: (d) => ({ legacyId: d ? "desc" : "asc" }),
  entryDate: (d) => [{ entryDate: { sort: d ? "desc" : "asc", nulls: "last" } }, { legacyId: "desc" }],
  daysInPipeline: (d) => [{ entryDate: { sort: d ? "asc" : "desc", nulls: "last" } }],
  amount: (d) => ({ amount: { sort: d ? "desc" : "asc", nulls: "last" } }),
  status: (d) => ({ status: { sortOrder: d ? "desc" : "asc" } }),
  operationType: (d) => ({ operationType: { name: d ? "desc" : "asc" } }),
  nextFollowUpAt: (d) => ({ nextFollowUpAt: { sort: d ? "desc" : "asc", nulls: "last" } }),
  updatedAt: (d) => ({ updatedAt: d ? "desc" : "asc" }),
  lastActivityAt: (d) => ({ lastActivityAt: { sort: d ? "desc" : "asc", nulls: "last" } }),
  exitDate: (d) => ({ exitDate: { sort: d ? "desc" : "asc", nulls: "last" } }),
  sector: (d) => ({ sector: { sort: d ? "desc" : "asc", nulls: "last" } }),
};

export async function listOpportunities(params: ListParams): Promise<{ rows: OpportunityRowDTO[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(500, Math.max(10, params.pageSize ?? 50));
  const where = buildWhere(params.filters);
  const sort = params.sort ?? { id: "entryDate", desc: true };
  const orderBy = (SORT_MAP[sort.id] ?? SORT_MAP.entryDate)(sort.desc);
  const [rows, total] = await Promise.all([
    prisma.opportunity.findMany({ where, select: opportunityListSelect, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.opportunity.count({ where }),
  ]);
  const now = new Date();
  return { rows: rows.map((r) => toRowDTO(r, now)), total, page, pageSize };
}

/** Full export (bounded) used by CSV/Excel export endpoints. */
export async function exportOpportunities(params: ListParams, limit = 5000): Promise<OpportunityRowDTO[]> {
  const where = buildWhere(params.filters);
  const sort = params.sort ?? { id: "entryDate", desc: true };
  const orderBy = (SORT_MAP[sort.id] ?? SORT_MAP.entryDate)(sort.desc);
  const rows = await prisma.opportunity.findMany({ where, select: opportunityListSelect, orderBy, take: limit });
  const now = new Date();
  return rows.map((r) => toRowDTO(r, now));
}

export async function getFilterOptions() {
  const [types, statuses, users, companies, years] = await Promise.all([
    prisma.operationType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, category: true, color: true } }),
    prisma.opportunityStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, key: true, name: true, group: true, color: true } }),
    prisma.user.findMany({ orderBy: [{ isArchived: "asc" }, { name: "asc" }], select: { id: true, name: true, initials: true, color: true, isArchived: true } }),
    prisma.company.findMany({ where: { isActive: true, originations: { some: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true, category: true } }),
    prisma.opportunity.groupBy({ by: ["entryYear"], where: { isDeleted: false, entryYear: { not: null } }, _count: true, orderBy: { entryYear: "desc" } }),
  ]);
  return { types, statuses, users, companies, years: years.map((y) => y.entryYear as number) };
}

export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>;

export const opportunityDetailInclude = {
  operationType: true,
  status: true,
  assignees: { include: { user: { select: { id: true, name: true, initials: true, color: true, isArchived: true, email: true } } } },
  originators: { include: { company: true, contact: true } },
  notes: { include: { user: { select: { id: true, name: true, initials: true, color: true } } }, orderBy: { createdAt: "desc" as const } },
  activities: { include: { user: { select: { id: true, name: true, initials: true, color: true } } }, orderBy: [{ occurredAt: "desc" as const }, { createdAt: "desc" as const }] },
  followUps: { include: { user: { select: { id: true, name: true } } }, orderBy: { dueAt: "asc" as const } },
  attachments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" as const } },
  auditLogs: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" as const }, take: 100 },
  issues: { where: { resolved: false } },
  importRows: { select: { sheet: true, sourceRow: true, sourceWorkbook: true, rawData: true, status: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.OpportunityInclude;

export type OpportunityDetail = Prisma.OpportunityGetPayload<{ include: typeof opportunityDetailInclude }>;

export async function getOpportunity(id: string): Promise<OpportunityDetail | null> {
  return prisma.opportunity.findFirst({ where: { id, isDeleted: false }, include: opportunityDetailInclude });
}
