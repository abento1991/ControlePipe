import type { Prisma } from "@prisma/client";

export interface OpportunityFilters {
  q?: string;
  years?: number[];
  from?: string;
  to?: string;
  typeIds?: string[];
  typeCategories?: string[];
  statusKeys?: string[];
  groups?: ("ACTIVE" | "ON_HOLD" | "CONCLUDED" | "CLOSED" | "LEGACY")[];
  companyIds?: string[];
  contactIds?: string[];
  originatorCategories?: string[];
  assigneeIds?: string[];
  channels?: string[];
  needsReview?: boolean;
  unassigned?: boolean;
  overdue?: boolean;
  noNextAction?: boolean;
  stale?: number; // days without activity
  aging?: string[]; // "<15" | "15–30" | ...
  sector?: string;
  /** Per-column header filters (column id → typed text). Serialized as cf_<column>. */
  columnFilters?: Record<string, string>;
}

export interface ListParams {
  filters: OpportunityFilters;
  sort?: { id: string; desc: boolean };
  page?: number;
  pageSize?: number;
}

const ARRAY_KEYS: (keyof OpportunityFilters)[] = ["typeIds", "typeCategories", "statusKeys", "groups", "companyIds", "contactIds", "originatorCategories", "assigneeIds", "channels", "aging"];

export type SearchParamsLike = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  const arr = (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

/** Parses URL search params into a filter object. Every filter lives in the URL so views are shareable. */
export function parseFilters(sp: SearchParamsLike): OpportunityFilters {
  const f: OpportunityFilters = {};
  if (typeof sp.q === "string" && sp.q.trim()) f.q = sp.q.trim();
  const years = list(sp.years)?.map((y) => parseInt(y, 10)).filter((n) => Number.isFinite(n));
  if (years?.length) f.years = years;
  if (typeof sp.from === "string" && sp.from) f.from = sp.from;
  if (typeof sp.to === "string" && sp.to) f.to = sp.to;
  for (const k of ARRAY_KEYS) {
    const v = list(sp[k]);
    if (v) (f as Record<string, unknown>)[k] = v;
  }
  if (sp.needsReview === "1") f.needsReview = true;
  if (sp.unassigned === "1") f.unassigned = true;
  if (sp.overdue === "1") f.overdue = true;
  if (sp.noNextAction === "1") f.noNextAction = true;
  if (typeof sp.stale === "string" && sp.stale) f.stale = parseInt(sp.stale, 10);
  if (typeof sp.sector === "string" && sp.sector) f.sector = sp.sector;
  const cf: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k.startsWith("cf_") && typeof v === "string" && v.trim()) cf[k.slice(3)] = v.trim();
  }
  if (Object.keys(cf).length) f.columnFilters = cf;
  return f;
}

export function filtersToSearchParams(f: OpportunityFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.years?.length) sp.set("years", f.years.join(","));
  if (f.from) sp.set("from", f.from);
  if (f.to) sp.set("to", f.to);
  for (const k of ARRAY_KEYS) {
    const v = f[k] as string[] | undefined;
    if (v?.length) sp.set(k, v.join(","));
  }
  if (f.needsReview) sp.set("needsReview", "1");
  if (f.unassigned) sp.set("unassigned", "1");
  if (f.overdue) sp.set("overdue", "1");
  if (f.noNextAction) sp.set("noNextAction", "1");
  if (f.stale) sp.set("stale", String(f.stale));
  if (f.sector) sp.set("sector", f.sector);
  for (const [k, v] of Object.entries(f.columnFilters ?? {})) if (v) sp.set(`cf_${k}`, v);
  return sp;
}

export function countActiveFilters(f: OpportunityFilters): number {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (k === "groups") continue;
    if (k === "columnFilters") {
      n += Object.values((v as Record<string, string>) ?? {}).filter(Boolean).length;
      continue;
    }
    if (Array.isArray(v) ? v.length : v) n++;
  }
  return n;
}

function agingRange(bucket: string, now: Date): { gte?: Date; lt?: Date } | null {
  const day = 86400000;
  const d = (n: number) => new Date(now.getTime() - n * day);
  switch (bucket) {
    case "<15":
      return { gte: d(15) };
    case "15–30":
      return { gte: d(31), lt: d(15) };
    case "31–60":
      return { gte: d(61), lt: d(31) };
    case "61–90":
      return { gte: d(91), lt: d(61) };
    case ">90":
      return { lt: d(91) };
    default:
      return null;
  }
}

/** "2026", "2026-08", "08/2026", "15/08/2026" → date range. */
export function parseDateFilter(text: string): { gte: Date; lt: Date } | null {
  const t = text.trim();
  let m = t.match(/^(\d{4})$/);
  if (m) return { gte: new Date(Date.UTC(+m[1], 0, 1)), lt: new Date(Date.UTC(+m[1] + 1, 0, 1)) };
  m = t.match(/^(\d{4})-(\d{1,2})$/) ?? t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const y = m[0].startsWith(m[1]) && m[1].length === 4 ? +m[1] : +m[2];
    const mo = m[1].length === 4 ? +m[2] : +m[1];
    return { gte: new Date(Date.UTC(y, mo - 1, 1)), lt: new Date(Date.UTC(y, mo, 1)) };
  }
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return { gte: d, lt: new Date(d.getTime() + 86400000) };
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return { gte: d, lt: new Date(d.getTime() + 86400000) };
  }
  return null;
}

/** ">30", "<15", ">=10", "30" (≥ 30), "10-20" (range) → numeric comparison. */
export function parseNumberFilter(text: string): { gte?: number; lte?: number; gt?: number; lt?: number } | null {
  const t = text.replace(/\s/g, "").replace(",", ".");
  let m = t.match(/^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const n = parseFloat(m[2]);
    switch (m[1]) {
      case ">":
        return { gt: n };
      case "<":
        return { lt: n };
      case "<=":
        return { lte: n };
      case "=":
        return { gte: n, lte: n };
      default:
        return { gte: n };
    }
  }
  m = t.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
  if (m) return { gte: parseFloat(m[1]), lte: parseFloat(m[2]) };
  return null;
}

const CHANNEL_TEXT: Record<string, string> = { EMAIL: "e-mail email", WHATSAPP: "whatsapp", LIGACAO: "ligação ligacao", REUNIAO: "reunião reuniao", INDICACAO: "indicação indicacao", ORIGINACAO_PROPRIA: "originação própria originacao propria", OUTRO: "outro" };

function daysRange(n: { gte?: number; lte?: number; gt?: number; lt?: number }, now: Date): Prisma.DateTimeNullableFilter {
  // more days in pipeline = earlier entry date
  const day = 86400000;
  const r: Prisma.DateTimeNullableFilter = {};
  if (n.gte !== undefined) r.lte = new Date(now.getTime() - n.gte * day);
  if (n.gt !== undefined) r.lt = new Date(now.getTime() - n.gt * day);
  if (n.lte !== undefined) r.gte = new Date(now.getTime() - n.lte * day);
  if (n.lt !== undefined) r.gt = new Date(now.getTime() - n.lt * day);
  return r;
}

const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });

/** Translates one header filter into a where clause. Unknown columns fall back to searching the name. */
export function columnFilterWhere(column: string, text: string, now: Date): Prisma.OpportunityWhereInput | null {
  const v = text.trim();
  if (!v) return null;
  switch (column) {
    case "legacyId":
      return /^\d+$/.test(v) ? { legacyId: parseInt(v, 10) } : { name: ci(v) };
    case "name":
      return { OR: [{ name: ci(v) }, { economicGroup: ci(v) }, { nameRaw: ci(v) }] };
    case "operationType":
      return { OR: [{ operationType: { name: ci(v) } }, { operationTypeRaw: ci(v) }] };
    case "status":
      return { OR: [{ status: { name: ci(v) } }, { statusRaw: ci(v) }] };
    case "company":
      return { OR: [{ originators: { some: { company: { OR: [{ name: ci(v) }, { shortName: ci(v) }] } } } }, { originatorRaw: ci(v) }] };
    case "contact":
      return { OR: [{ originators: { some: { contact: { fullName: ci(v) } } } }, { originatorRaw: ci(v) }] };
    case "originatorRaw":
      return { originatorRaw: ci(v) };
    case "assignees":
      return { OR: [{ assignees: { some: { user: { name: ci(v) } } } }, { assigneesRaw: ci(v) }] };
    case "entryChannel": {
      const keys = Object.entries(CHANNEL_TEXT).filter(([, t]) => t.includes(v.toLowerCase())).map(([k]) => k);
      return keys.length ? { entryChannel: { in: keys as Prisma.EnumEntryChannelNullableFilter["in"] } } : { entryChannel: { in: [] } };
    }
    case "nextAction":
      return { nextAction: ci(v) };
    case "sector":
      return { sector: ci(v) };
    case "history":
      return { OR: [{ legacyStatusText: ci(v) }, { activities: { some: { body: ci(v) } } }, { notes: { some: { body: ci(v) } } }] };
    case "feedback":
      return { OR: [{ closeReason: ci(v) }, { legacyFeedback: ci(v) }] };
    case "amount": {
      const n = parseNumberFilter(v);
      return n ? { amount: n } : { amountRaw: ci(v) };
    }
    case "daysInPipeline": {
      const n = parseNumberFilter(v);
      return n ? { entryDate: daysRange(n, now) } : null;
    }
    case "entryDate":
    case "nextFollowUpAt":
    case "lastActivityAt":
    case "updatedAt":
    case "exitDate": {
      const r = parseDateFilter(v);
      if (!r) return null;
      return { [column]: { gte: r.gte, lt: r.lt } } as Prisma.OpportunityWhereInput;
    }
    default:
      return { name: ci(v) };
  }
}

/** Translates filters into a Prisma where clause. All filtering happens in the database. */
export function buildWhere(f: OpportunityFilters, now: Date = new Date()): Prisma.OpportunityWhereInput {
  const and: Prisma.OpportunityWhereInput[] = [{ isDeleted: false }];
  if (f.q) {
    const q = f.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { economicGroup: { contains: q, mode: "insensitive" } },
        { originatorRaw: { contains: q, mode: "insensitive" } },
        { legacyStatusText: { contains: q, mode: "insensitive" } },
        { legacyFeedback: { contains: q, mode: "insensitive" } },
        { emailSubject: { contains: q, mode: "insensitive" } },
        { sector: { contains: q, mode: "insensitive" } },
        { originators: { some: { OR: [{ company: { name: { contains: q, mode: "insensitive" } } }, { contact: { fullName: { contains: q, mode: "insensitive" } } }] } } },
        { assignees: { some: { user: { name: { contains: q, mode: "insensitive" } } } } },
        { notes: { some: { body: { contains: q, mode: "insensitive" } } } },
        ...(/^\d+$/.test(q) ? [{ legacyId: parseInt(q, 10) }] : []),
      ],
    });
  }
  if (f.years?.length) and.push({ entryYear: { in: f.years } });
  if (f.from) and.push({ entryDate: { gte: new Date(`${f.from}T00:00:00Z`) } });
  if (f.to) and.push({ entryDate: { lte: new Date(`${f.to}T23:59:59Z`) } });
  if (f.typeIds?.length) and.push({ operationTypeId: { in: f.typeIds } });
  if (f.typeCategories?.length) and.push({ operationType: { category: { in: f.typeCategories as Prisma.EnumOperationCategoryFilter["in"] } } });
  if (f.statusKeys?.length) and.push({ status: { key: { in: f.statusKeys } } });
  if (f.groups?.length) and.push({ status: { group: { in: f.groups } } });
  if (f.companyIds?.length) and.push({ originators: { some: { companyId: { in: f.companyIds } } } });
  if (f.contactIds?.length) and.push({ originators: { some: { contactId: { in: f.contactIds } } } });
  if (f.originatorCategories?.length) and.push({ originatorCategory: { in: f.originatorCategories as Prisma.EnumCompanyCategoryNullableFilter["in"] } });
  if (f.assigneeIds?.length) and.push({ assignees: { some: { userId: { in: f.assigneeIds } } } });
  if (f.channels?.length) and.push({ entryChannel: { in: f.channels as Prisma.EnumEntryChannelNullableFilter["in"] } });
  if (f.needsReview) and.push({ needsReview: true });
  if (f.unassigned) and.push({ assignees: { none: {} } });
  if (f.overdue) and.push({ nextFollowUpAt: { lt: now } });
  if (f.noNextAction) and.push({ OR: [{ nextAction: null }, { nextAction: "" }] });
  if (f.stale) {
    const cutoff = new Date(now.getTime() - f.stale * 86400000);
    and.push({ OR: [{ lastActivityAt: { lt: cutoff } }, { lastActivityAt: null, updatedAt: { lt: cutoff } }] });
  }
  if (f.aging?.length) {
    const ors = f.aging.map((b) => agingRange(b, now)).filter(Boolean) as { gte?: Date; lt?: Date }[];
    if (ors.length) and.push({ OR: ors.map((r) => ({ entryDate: r })) });
  }
  if (f.sector) and.push({ sector: { contains: f.sector, mode: "insensitive" } });
  for (const [col, text] of Object.entries(f.columnFilters ?? {})) {
    const w = columnFilterWhere(col, text, now);
    if (w) and.push(w);
  }
  return { AND: and };
}
