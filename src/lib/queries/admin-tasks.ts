import { prisma } from "../db";
import { ADMIN_TASK_OPEN_STATUSES } from "../normalization/admin-tasks";

export interface AdminTaskFilters {
  scope?: "open" | "done" | "all";
  category?: string;
  assigneeId?: string;
  q?: string;
}

/** All administrative tasks (a few hundred at most) with the latest update, for the two-pane screen. */
export async function getAdminTasks(filters: AdminTaskFilters = {}, now: Date = new Date()) {
  const [rows, team] = await Promise.all([
    prisma.adminTask.findMany({
      where: {
        isDeleted: false,
        ...(filters.scope === "open" ? { status: { in: ADMIN_TASK_OPEN_STATUSES } } : filters.scope === "done" ? { status: { in: ["DONE", "CANCELED"] } } : {}),
        ...(filters.category ? { category: filters.category as never } : {}),
        ...(filters.assigneeId ? { assignees: { some: { userId: filters.assigneeId } } } : {}),
        ...(filters.q ? { OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { description: { contains: filters.q, mode: "insensitive" } }, { counterpart: { contains: filters.q, mode: "insensitive" } }] } : {}),
      },
      include: {
        assignees: { select: { user: { select: { id: true, name: true, initials: true, color: true, isArchived: true } } } },
        updates: { orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 1, select: { body: true, occurredAt: true, user: { select: { name: true } } } },
        _count: { select: { updates: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 1000,
    }),
    prisma.user.findMany({ where: { isActive: true, isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, initials: true, color: true } }),
  ]);
  const sourceIds = rows.map((r) => r.sourceOpportunityId).filter((x): x is string => !!x);
  const sources = sourceIds.length ? await prisma.opportunity.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true, legacyId: true, status: { select: { name: true } } } }) : [];
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const statusRank: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, WAITING: 2, DONE: 3, CANCELED: 4 };
  const prioRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const tasks = rows
    .map((t) => {
      const open = ADMIN_TASK_OPEN_STATUSES.includes(t.status);
      const overdue = open && !!t.dueAt && t.dueAt < now;
      const src = t.sourceOpportunityId ? sourceById.get(t.sourceOpportunityId) : null;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        status: t.status,
        priority: t.priority,
        counterpart: t.counterpart,
        dueAt: t.dueAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        overdue,
        open,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        lastActivityAt: (t.lastActivityAt ?? t.updatedAt).toISOString(),
        daysSinceMovement: Math.floor((now.getTime() - (t.lastActivityAt ?? t.updatedAt).getTime()) / 86400000),
        assignees: t.assignees.map((a) => a.user),
        createdBy: t.createdBy?.name ?? null,
        lastUpdate: t.updates[0] ? { body: t.updates[0].body, date: t.updates[0].occurredAt.toISOString(), user: t.updates[0].user?.name ?? null } : null,
        updatesCount: t._count.updates,
        source: src ? { id: src.id, name: src.name, legacyId: src.legacyId, status: src.status.name } : null,
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      const s = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      if (s) return s;
      const p = (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9);
      if (p) return p;
      const da = a.dueAt ? Date.parse(a.dueAt) : Infinity;
      const db = b.dueAt ? Date.parse(b.dueAt) : Infinity;
      if (da !== db) return da - db;
      return Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt);
    });
  const all = await prisma.adminTask.groupBy({ by: ["status"], where: { isDeleted: false }, _count: true });
  const count = (keys: string[]) => all.filter((g) => keys.includes(g.status)).reduce((acc, g) => acc + g._count, 0);
  return {
    tasks,
    team,
    summary: { open: count(ADMIN_TASK_OPEN_STATUSES), done: count(["DONE", "CANCELED"]), all: count(all.map((g) => g.status)), overdue: tasks.filter((t) => t.overdue).length, duplicated: tasks.filter((t) => t.source).length },
  };
}

export type AdminTasksData = Awaited<ReturnType<typeof getAdminTasks>>;
export type AdminTaskDTO = AdminTasksData["tasks"][number];

export async function getAdminTaskUpdates(taskId: string) {
  const rows = await prisma.adminTaskUpdate.findMany({ where: { taskId }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 300, select: { id: true, body: true, occurredAt: true, isLegacy: true, user: { select: { name: true } } } });
  return rows.map((r) => ({ id: r.id, body: r.body, date: r.occurredAt.toISOString(), isLegacy: r.isLegacy, user: r.user?.name ?? null }));
}
