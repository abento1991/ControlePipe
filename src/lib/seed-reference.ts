import type { PrismaClient } from "@prisma/client";
import { STATUS_DEFINITIONS } from "./normalization/status";
import { OPERATION_TYPE_DEFINITIONS } from "./normalization/operation-types";
import { TEAM_MEMBERS } from "./normalization/assignees";
import { initialsOf } from "./normalization/text";
import { inferDeclineReason } from "./normalization/decline-reasons";

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
}
