import { prisma } from "../db";

export interface SearchResult {
  type: "opportunity" | "company" | "contact" | "user";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function globalSearch(q: string, limit = 8): Promise<SearchResult[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const [opps, companies, contacts, users] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { legacyStatusText: { contains: term, mode: "insensitive" } },
          { legacyFeedback: { contains: term, mode: "insensitive" } },
          { originatorRaw: { contains: term, mode: "insensitive" } },
          { notes: { some: { body: { contains: term, mode: "insensitive" } } } },
          { assignees: { some: { user: { name: { contains: term, mode: "insensitive" } } } } },
          ...(/^\d+$/.test(term) ? [{ legacyId: parseInt(term, 10) }] : []),
        ],
      },
      select: { id: true, name: true, legacyId: true, status: { select: { name: true } }, operationType: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.company.findMany({ where: { isActive: true, OR: [{ name: { contains: term, mode: "insensitive" } }, { aliases: { some: { alias: { contains: term, mode: "insensitive" } } } }] }, select: { id: true, name: true, category: true }, take: 5 }),
    prisma.contact.findMany({ where: { isActive: true, OR: [{ fullName: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }] }, select: { id: true, fullName: true, company: { select: { name: true } } }, take: 5 }),
    prisma.user.findMany({ where: { name: { contains: term, mode: "insensitive" } }, select: { id: true, name: true }, take: 3 }),
  ]);
  return [
    ...opps.map((o) => ({ type: "opportunity" as const, id: o.id, title: o.name, subtitle: [o.legacyId ? `#${o.legacyId}` : null, o.operationType?.name, o.status.name].filter(Boolean).join(" · "), href: `/opportunities/${o.id}` })),
    ...companies.map((c) => ({ type: "company" as const, id: c.id, title: c.name, subtitle: c.category, href: `/companies/${c.id}` })),
    ...contacts.map((c) => ({ type: "contact" as const, id: c.id, title: c.fullName, subtitle: c.company?.name ?? undefined, href: `/originators/${c.id}` })),
    ...users.map((u) => ({ type: "user" as const, id: u.id, title: u.name, subtitle: "Responsável", href: `/pipeline?assigneeIds=${u.id}` })),
  ];
}
