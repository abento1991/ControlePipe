import { Prisma } from "@prisma/client";
import { prisma } from "../db";

export interface OriginatorCrmRow {
  id: string;
  kind: "contact" | "company";
  name: string;
  companyId: string | null;
  companyName: string | null;
  category: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  title: string | null;
  relationship: string;
  casesYear: number;
  casesTotal: number;
  active: number;
  onHold: number;
  concluded: number;
  declined: number;
  advanced: number;
  conversion: number | null;
  volume: number;
  lastInteractionAt: string | null;
  nextFollowUpAt: string | null;
  needsReview: boolean;
}

/**
 * CRM aggregates computed in SQL. "advanced" counts opportunities that at least reached a proposal
 * (activity PROPOSAL_SENT / legacy text mentioning proposal) or were concluded.
 */
export async function listContactsCrm(year: number): Promise<OriginatorCrmRow[]> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    WITH opp AS (
      SELECT oo."contactId" AS cid, o.id, o."entryYear", o.amount, s."group" AS grp, s.outcome,
             (o."legacyStatusText" ILIKE '%proposta%' OR EXISTS (SELECT 1 FROM "Activity" a WHERE a."opportunityId" = o.id AND a.type = 'PROPOSAL_SENT')) AS proposal
      FROM "OpportunityOriginator" oo
      JOIN "Opportunity" o ON o.id = oo."opportunityId" AND o."isDeleted" = false
      JOIN "OpportunityStatus" s ON s.id = o."statusId"
      WHERE oo."contactId" IS NOT NULL
    )
    SELECT c.id, c."fullName" AS name, c."companyId", co.name AS "companyName", COALESCE(c.category::text, co.category::text) AS category,
           c.email, c.phone, c.whatsapp, c.title, c.relationship::text AS relationship, c."lastContactAt", c."nextFollowUpAt", c."needsReview",
           COUNT(opp.id)::int AS "casesTotal",
           COUNT(opp.id) FILTER (WHERE opp."entryYear" = ${year})::int AS "casesYear",
           COUNT(opp.id) FILTER (WHERE opp.grp = 'ACTIVE')::int AS active,
           COUNT(opp.id) FILTER (WHERE opp.grp = 'ON_HOLD')::int AS "onHold",
           COUNT(opp.id) FILTER (WHERE opp.grp = 'CONCLUDED')::int AS concluded,
           COUNT(opp.id) FILTER (WHERE opp.outcome = 'LOST')::int AS declined,
           COUNT(opp.id) FILTER (WHERE opp.proposal OR opp.grp = 'CONCLUDED')::int AS advanced,
           COALESCE(SUM(opp.amount), 0)::float AS volume
    FROM "Contact" c
    LEFT JOIN "Company" co ON co.id = c."companyId"
    LEFT JOIN opp ON opp.cid = c.id
    WHERE c."isActive" = true
    GROUP BY c.id, co.name, co.category
    ORDER BY "casesTotal" DESC, c."fullName" ASC
  `);
  return rows.map((r) => mapRow(r, "contact"));
}

export async function listCompaniesCrm(year: number): Promise<OriginatorCrmRow[]> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    WITH opp AS (
      SELECT oo."companyId" AS cid, o.id, o."entryYear", o.amount, s."group" AS grp, s.outcome,
             (o."legacyStatusText" ILIKE '%proposta%' OR EXISTS (SELECT 1 FROM "Activity" a WHERE a."opportunityId" = o.id AND a.type = 'PROPOSAL_SENT')) AS proposal
      FROM "OpportunityOriginator" oo
      JOIN "Opportunity" o ON o.id = oo."opportunityId" AND o."isDeleted" = false
      JOIN "OpportunityStatus" s ON s.id = o."statusId"
      WHERE oo."companyId" IS NOT NULL
    )
    SELECT c.id, c.name, NULL::text AS "companyId", NULL::text AS "companyName", c.category::text AS category,
           NULL::text AS email, NULL::text AS phone, NULL::text AS whatsapp, NULL::text AS title, c.relationship::text AS relationship,
           c."lastInteractionAt" AS "lastContactAt", NULL::timestamp AS "nextFollowUpAt", c."needsReview",
           COUNT(opp.id)::int AS "casesTotal",
           COUNT(opp.id) FILTER (WHERE opp."entryYear" = ${year})::int AS "casesYear",
           COUNT(opp.id) FILTER (WHERE opp.grp = 'ACTIVE')::int AS active,
           COUNT(opp.id) FILTER (WHERE opp.grp = 'ON_HOLD')::int AS "onHold",
           COUNT(opp.id) FILTER (WHERE opp.grp = 'CONCLUDED')::int AS concluded,
           COUNT(opp.id) FILTER (WHERE opp.outcome = 'LOST')::int AS declined,
           COUNT(opp.id) FILTER (WHERE opp.proposal OR opp.grp = 'CONCLUDED')::int AS advanced,
           COALESCE(SUM(opp.amount), 0)::float AS volume
    FROM "Company" c
    LEFT JOIN opp ON opp.cid = c.id
    WHERE c."isActive" = true
    GROUP BY c.id
    ORDER BY "casesTotal" DESC, c.name ASC
  `);
  return rows.map((r) => mapRow(r, "company"));
}

function mapRow(r: Record<string, unknown>, kind: "contact" | "company"): OriginatorCrmRow {
  const casesTotal = Number(r.casesTotal ?? 0);
  const concluded = Number(r.concluded ?? 0);
  const declined = Number(r.declined ?? 0);
  const decided = concluded + declined;
  const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
  return {
    id: String(r.id),
    kind,
    name: String(r.name),
    companyId: (r.companyId as string | null) ?? null,
    companyName: (r.companyName as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    whatsapp: (r.whatsapp as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    relationship: String(r.relationship ?? "NOVO"),
    casesYear: Number(r.casesYear ?? 0),
    casesTotal,
    active: Number(r.active ?? 0),
    onHold: Number(r.onHold ?? 0),
    concluded,
    declined,
    advanced: Number(r.advanced ?? 0),
    conversion: decided ? concluded / decided : null,
    volume: Number(r.volume ?? 0),
    lastInteractionAt: toIso(r.lastContactAt),
    nextFollowUpAt: toIso(r.nextFollowUpAt),
    needsReview: Boolean(r.needsReview),
  };
}

export const contactDetailInclude = {
  company: true,
  originations: {
    include: { opportunity: { select: { id: true, name: true, entryDate: true, amount: true, status: { select: { name: true, group: true, color: true } }, operationType: { select: { name: true } }, lastActivityAt: true, nextFollowUpAt: true } } },
    orderBy: { opportunity: { entryDate: "desc" as const } },
  },
  interactions: { include: { user: { select: { id: true, name: true } } }, orderBy: { occurredAt: "desc" as const }, take: 50 },
} satisfies Prisma.ContactInclude;

export async function getContact(id: string) {
  return prisma.contact.findUnique({ where: { id }, include: contactDetailInclude });
}

export const companyDetailInclude = {
  contacts: { orderBy: { fullName: "asc" as const } },
  aliases: true,
  originations: {
    include: { contact: { select: { id: true, fullName: true } }, opportunity: { select: { id: true, name: true, entryDate: true, amount: true, status: { select: { name: true, group: true, color: true } }, operationType: { select: { name: true } }, lastActivityAt: true, nextFollowUpAt: true } } },
    orderBy: { opportunity: { entryDate: "desc" as const } },
  },
  interactions: { include: { user: { select: { id: true, name: true } } }, orderBy: { occurredAt: "desc" as const }, take: 50 },
} satisfies Prisma.CompanyInclude;

export async function getCompany(id: string) {
  return prisma.company.findUnique({ where: { id }, include: companyDetailInclude });
}

export async function searchCompanies(q: string, limit = 20) {
  return prisma.company.findMany({ where: { isActive: true, OR: [{ name: { contains: q, mode: "insensitive" } }, { shortName: { contains: q, mode: "insensitive" } }, { aliases: { some: { alias: { contains: q, mode: "insensitive" } } } }] }, select: { id: true, name: true, category: true }, orderBy: { name: "asc" }, take: limit });
}

export async function searchContacts(q: string, companyId?: string | null, limit = 20) {
  return prisma.contact.findMany({ where: { isActive: true, ...(companyId ? { companyId } : {}), fullName: { contains: q, mode: "insensitive" } }, select: { id: true, fullName: true, companyId: true, company: { select: { name: true } } }, orderBy: { fullName: "asc" }, take: limit });
}
