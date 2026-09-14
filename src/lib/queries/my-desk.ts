import { prisma } from "../db";

const HIDDEN_ACTIVITY_TYPES = ["IMPORTED", "ASSIGNEE_CHANGED"] as const;

/** Everything one person's desk needs: their cases (active + on hold) with the latest movement and open follow-ups. */
export async function getMyDesk(userId: string, now: Date = new Date()) {
  const [owner, team, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, initials: true, color: true } }),
    prisma.user.findMany({ where: { isActive: true, isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, initials: true, color: true } }),
    prisma.opportunity.findMany({
      where: { isDeleted: false, status: { group: { in: ["ACTIVE", "ON_HOLD"] } }, assignees: { some: { userId } } },
      select: {
        id: true,
        name: true,
        economicGroup: true,
        entryDate: true,
        amount: true,
        nextAction: true,
        nextFollowUpAt: true,
        lastActivityAt: true,
        updatedAt: true,
        status: { select: { key: true, name: true, color: true, group: true } },
        operationType: { select: { id: true, name: true, color: true } },
        originators: { where: { role: "PRIMARY" }, select: { company: { select: { id: true, name: true } }, contact: { select: { id: true, fullName: true } } } },
        assignees: { select: { user: { select: { id: true, name: true, initials: true, color: true, isArchived: true } } } },
        activities: { where: { type: { notIn: [...HIDDEN_ACTIVITY_TYPES] } }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 1, select: { type: true, title: true, body: true, occurredAt: true, isLegacy: true } },
        followUps: { where: { completedAt: null }, orderBy: { dueAt: "asc" }, take: 5, select: { id: true, action: true, dueAt: true, user: { select: { id: true, name: true } } } },
      },
      take: 300,
    }),
  ]);

  const cases = rows
    .map((o) => {
      const last = o.activities[0] ?? null;
      const overdue = !!o.nextFollowUpAt && o.nextFollowUpAt < now;
      const lastMovement = o.lastActivityAt ?? last?.occurredAt ?? o.updatedAt;
      return {
        id: o.id,
        name: o.name,
        economicGroup: o.economicGroup,
        entryDate: o.entryDate?.toISOString() ?? null,
        amount: o.amount === null ? null : Number(o.amount),
        nextAction: o.nextAction,
        nextFollowUpAt: o.nextFollowUpAt?.toISOString() ?? null,
        overdue,
        daysSinceMovement: Math.floor((now.getTime() - lastMovement.getTime()) / 86400000),
        status: o.status,
        operationType: o.operationType,
        company: o.originators[0]?.company ?? null,
        contact: o.originators[0]?.contact ?? null,
        assignees: o.assignees.map((a) => a.user),
        lastUpdate: last ? { type: last.type, text: last.body ?? last.title ?? "", date: last.occurredAt.toISOString(), isLegacy: last.isLegacy } : null,
        followUps: o.followUps.map((f) => ({ id: f.id, action: f.action, dueAt: f.dueAt.toISOString(), overdue: f.dueAt < now, user: f.user?.name ?? null })),
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.status.group !== b.status.group) return a.status.group === "ACTIVE" ? -1 : 1;
      const fa = a.nextFollowUpAt ? Date.parse(a.nextFollowUpAt) : Infinity;
      const fb = b.nextFollowUpAt ? Date.parse(b.nextFollowUpAt) : Infinity;
      if (fa !== fb) return fa - fb;
      return a.daysSinceMovement - b.daysSinceMovement;
    });

  return {
    owner,
    team,
    cases,
    summary: {
      active: cases.filter((c) => c.status.group === "ACTIVE").length,
      onHold: cases.filter((c) => c.status.group === "ON_HOLD").length,
      overdue: cases.filter((c) => c.overdue).length,
      stale: cases.filter((c) => c.status.group === "ACTIVE" && c.daysSinceMovement > 30).length,
    },
  };
}

export type MyDesk = Awaited<ReturnType<typeof getMyDesk>>;
export type DeskCase = MyDesk["cases"][number];
