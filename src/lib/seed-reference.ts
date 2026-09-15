import type { PrismaClient } from "@prisma/client";
import { STATUS_DEFINITIONS } from "./normalization/status";
import { OPERATION_TYPE_DEFINITIONS } from "./normalization/operation-types";
import { TEAM_MEMBERS } from "./normalization/assignees";
import { initialsOf } from "./normalization/text";
import { inferDeclineReason } from "./normalization/decline-reasons";
import { LEGACY_ADMIN_TASKS, RETIRE_LEGACY_ADMIN_TASK_SOURCES } from "./normalization/admin-tasks";

/**
 * Fills the structured decline reason of declined opportunities that only carry free text (legacy sheet or
 * older closes), marking them as inferred. Never touches a reason chosen by a person.
 */
export async function backfillDeclineReasons(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.opportunity.findMany({
    where: { isDeleted: false, declineReason: null, status: { outcome: "LOST" } },
    select: { id: true, closeReason: true, legacyFeedback: true },
  });
  let n = 0;
  for (const o of rows) {
    const inferred = inferDeclineReason(o.closeReason || o.legacyFeedback);
    if (!inferred) continue;
    await prisma.opportunity.update({ where: { id: o.id }, data: { declineReason: inferred.reason, declinedBy: inferred.declinedBy, declineReasonInferred: true } });
    n++;
  }
  return n;
}

/**
 * Duplicates the historical pipeline rows listed in LEGACY_ADMIN_TASKS as administrative tasks (once per source
 * opportunity). The pipeline rows are left untouched until the team decides to swap the bases.
 */
export async function backfillAdminTasks(prisma: PrismaClient): Promise<number> {
  let created = 0;
  for (const def of LEGACY_ADMIN_TASKS) {
    const opp = await prisma.opportunity.findFirst({
      where: { legacyId: def.legacyId, isDeleted: false },
      include: { status: true, assignees: { select: { userId: true } }, activities: { where: { type: { in: ["LEGACY_STATUS", "LEGACY_FEEDBACK", "NOTE", "MEETING_SNAPSHOT"] } }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
    });
    if (!opp) continue;
    const existing = await prisma.adminTask.findUnique({ where: { sourceOpportunityId: opp.id } });
    if (existing) continue;
    const status = opp.status.group === "CONCLUDED" ? "DONE" : opp.status.group === "CLOSED" ? "CANCELED" : opp.status.group === "ON_HOLD" ? "WAITING" : "IN_PROGRESS";
    const done = status === "DONE" || status === "CANCELED";
    const descriptionParts = [def.note, opp.closeReason || opp.legacyFeedback].filter(Boolean);
    const updates = opp.activities.filter((a) => (a.body ?? "").trim()).map((a) => ({ body: (a.body ?? "").trim(), occurredAt: a.occurredAt, isLegacy: true }));
    const last = updates.length ? updates[updates.length - 1].occurredAt : opp.lastActivityAt ?? opp.updatedAt;
    await prisma.adminTask.create({
      data: {
        title: def.title,
        category: def.category,
        status,
        priority: "MEDIUM",
        counterpart: def.counterpart ?? opp.originatorRaw ?? null,
        description: descriptionParts.length ? descriptionParts.join("\n\n") : null,
        sourceOpportunityId: opp.id,
        sourceLegacyId: opp.legacyId,
        completedAt: done ? opp.closedAt ?? opp.exitDate ?? last : null,
        lastActivityAt: last,
        createdAt: opp.entryDate ?? opp.createdAt,
        assignees: { create: opp.assignees.map((a) => ({ userId: a.userId })) },
        updates: { create: updates },
      },
    });
    created++;
  }
  return created;
}

/**
 * Swap of the bases: hides (soft-deletes) the pipeline rows that were duplicated as administrative tasks, so the
 * task becomes the only version. Reversible (isDeleted flag + audit log). Runs once per row.
 */
export async function retireLegacyAdminTaskSources(prisma: PrismaClient): Promise<number> {
  if (!RETIRE_LEGACY_ADMIN_TASK_SOURCES) return 0;
  const legacyIds = LEGACY_ADMIN_TASKS.map((t) => t.legacyId);
  const tasks = await prisma.adminTask.findMany({ where: { sourceLegacyId: { in: legacyIds }, sourceOpportunityId: { not: null } }, select: { id: true, sourceOpportunityId: true, sourceLegacyId: true } });
  let retired = 0;
  for (const t of tasks) {
    const opp = await prisma.opportunity.findFirst({ where: { id: t.sourceOpportunityId!, isDeleted: false }, select: { id: true, name: true } });
    if (!opp) continue;
    await prisma.$transaction([
      prisma.opportunity.update({ where: { id: opp.id }, data: { isDeleted: true } }),
      prisma.auditLog.create({ data: { entity: "Opportunity", entityId: opp.id, opportunityId: opp.id, action: "moved_to_admin_task", field: "isDeleted", oldValue: "false", newValue: `true (tarefa administrativa ${t.id})` } }),
      prisma.adminTaskUpdate.create({ data: { taskId: t.id, body: `Caso #${t.sourceLegacyId ?? ""} removido do pipe: era tarefa administrativa, não oportunidade.`, occurredAt: new Date() } }),
    ]);
    retired++;
  }
  return retired;
}

/** Idempotently seeds statuses, operation types and team users. Safe to run many times. */
export async function seedReferenceData(prisma: PrismaClient, opts: { passwordHash?: string | null } = {}) {
  for (const s of STATUS_DEFINITIONS) {
    await prisma.opportunityStatus.upsert({
      where: { key: s.key },
      update: { name: s.name, group: s.group, outcome: s.outcome, sortOrder: s.sortOrder, color: s.color, isLegacy: !!s.isLegacy },
      create: { key: s.key, name: s.name, group: s.group, outcome: s.outcome, sortOrder: s.sortOrder, color: s.color, isLegacy: !!s.isLegacy },
    });
  }
  for (const t of OPERATION_TYPE_DEFINITIONS) {
    await prisma.operationType.upsert({
      where: { slug: t.slug },
      update: { name: t.name, category: t.category, color: t.color, sortOrder: t.sortOrder, description: t.description },
      create: { slug: t.slug, name: t.name, category: t.category, color: t.color, sortOrder: t.sortOrder, description: t.description },
    });
  }
  for (const m of TEAM_MEMBERS) {
    const existing =
      (await prisma.user.findUnique({ where: { email: m.email } })) ??
      (m.previousEmails?.length ? await prisma.user.findFirst({ where: { email: { in: m.previousEmails } } }) : null);
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { email: m.email, name: m.name, isArchived: m.isArchived, color: m.color, initials: initialsOf(m.name.replace(/\(.*\)/, "")), ...(!existing.passwordHash && !m.isArchived && opts.passwordHash ? { passwordHash: opts.passwordHash } : {}) },
      });
    } else {
      await prisma.user.create({
        data: {
          name: m.name,
          email: m.email,
          role: m.key === "antonio" || m.key === "equipe" ? "ADMIN" : "USER",
          isArchived: m.isArchived,
          isActive: !m.isArchived,
          color: m.color,
          initials: initialsOf(m.name.replace(/\(.*\)/, "")),
          passwordHash: m.isArchived ? null : opts.passwordHash ?? null,
        },
      });
    }
  }
  const inferred = await backfillDeclineReasons(prisma);
  if (inferred) console.log(`Decline reasons inferred from legacy text: ${inferred}`);
  const tasks = await backfillAdminTasks(prisma);
  if (tasks) console.log(`Administrative tasks duplicated from legacy rows: ${tasks}`);
  const retired = await retireLegacyAdminTaskSources(prisma);
  if (retired) console.log(`Pipeline rows hidden after moving to administrative tasks: ${retired}`);
}
