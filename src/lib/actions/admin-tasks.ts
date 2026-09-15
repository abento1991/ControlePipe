"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { actionUser, actionAdmin } from "../session";
import { logAudit } from "../audit";
import { ok, fail, errorMessage, type ActionResult } from "./result";

const CATEGORY = z.enum(["APRESENTACAO_MATERIAL", "RELACIONAMENTO_ORIGINADOR", "FUNDO_ESTRUTURA", "FERRAMENTAS_FORNECEDORES", "JURIDICO_COMPLIANCE", "MARKETING_COMUNICACAO", "INTERNO_OUTRO"]);
const STATUS = z.enum(["TODO", "IN_PROGRESS", "WAITING", "DONE", "CANCELED"]);
const PRIORITY = z.enum(["LOW", "MEDIUM", "HIGH"]);

const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(200),
  description: z.string().nullable().optional(),
  category: CATEGORY.optional(),
  status: STATUS.optional(),
  priority: PRIORITY.optional(),
  dueAt: z.string().nullable().optional(),
  counterpart: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

function revalidate() {
  revalidatePath("/tarefas");
  revalidatePath("/minha-mesa");
}

export async function createAdminTask(input: z.input<typeof taskSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const now = new Date();
    const task = await prisma.adminTask.create({
      data: {
        title: d.title,
        description: d.description?.trim() || null,
        category: d.category ?? "INTERNO_OUTRO",
        status: d.status ?? "TODO",
        priority: d.priority ?? "MEDIUM",
        dueAt: d.dueAt ? new Date(`${d.dueAt}T00:00:00Z`) : null,
        counterpart: d.counterpart?.trim() || null,
        createdById: user.id,
        lastActivityAt: now,
        assignees: { create: (d.assigneeIds?.length ? d.assigneeIds : [user.id]).map((userId) => ({ userId })) },
      },
    });
    await logAudit(prisma, { entity: "AdminTask", entityId: task.id, action: "create", userId: user.id, changes: [{ field: "title", oldValue: null, newValue: d.title }] });
    revalidate();
    return ok({ id: task.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const updateSchema = taskSchema.partial();

export async function updateAdminTask(id: string, input: z.input<typeof updateSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const before = await prisma.adminTask.findUnique({ where: { id }, include: { assignees: true } });
    if (!before || before.isDeleted) return fail("Tarefa não encontrada.");
    const now = new Date();
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    const data: Record<string, unknown> = { lastActivityAt: now };
    if (d.title !== undefined) { data.title = d.title; changes.push({ field: "title", oldValue: before.title, newValue: d.title }); }
    if (d.description !== undefined) { data.description = d.description?.trim() || null; changes.push({ field: "description", oldValue: before.description, newValue: data.description }); }
    if (d.category !== undefined) { data.category = d.category; changes.push({ field: "category", oldValue: before.category, newValue: d.category }); }
    if (d.priority !== undefined) { data.priority = d.priority; changes.push({ field: "priority", oldValue: before.priority, newValue: d.priority }); }
    if (d.counterpart !== undefined) { data.counterpart = d.counterpart?.trim() || null; changes.push({ field: "counterpart", oldValue: before.counterpart, newValue: data.counterpart }); }
    if (d.dueAt !== undefined) { data.dueAt = d.dueAt ? new Date(`${d.dueAt}T00:00:00Z`) : null; changes.push({ field: "dueAt", oldValue: before.dueAt, newValue: data.dueAt }); }
    if (d.status !== undefined && d.status !== before.status) {
      data.status = d.status;
      const done = d.status === "DONE" || d.status === "CANCELED";
      data.completedAt = done ? now : null;
      changes.push({ field: "status", oldValue: before.status, newValue: d.status });
      await prisma.adminTaskUpdate.create({ data: { taskId: id, body: `Status: ${before.status} → ${d.status}`, occurredAt: now, userId: user.id } });
    }
    await prisma.$transaction(async (tx) => {
      await tx.adminTask.update({ where: { id }, data });
      if (d.assigneeIds !== undefined) {
        await tx.adminTaskAssignee.deleteMany({ where: { taskId: id } });
        if (d.assigneeIds.length) await tx.adminTaskAssignee.createMany({ data: d.assigneeIds.map((userId) => ({ taskId: id, userId })) });
        changes.push({ field: "assignees", oldValue: before.assignees.map((a) => a.userId), newValue: d.assigneeIds });
      }
      if (changes.length) await logAudit(tx, { entity: "AdminTask", entityId: id, action: "update", userId: user.id, changes });
    });
    revalidate();
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function addAdminTaskUpdate(id: string, text: string, dateISO?: string | null): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const body = text.trim();
    if (!body) return fail("Escreva o andamento.");
    const occurredAt = dateISO ? new Date(`${dateISO}T12:00:00Z`) : new Date();
    const u = await prisma.adminTaskUpdate.create({ data: { taskId: id, body, occurredAt, userId: user.id } });
    await prisma.adminTask.update({ where: { id }, data: { lastActivityAt: new Date() } });
    revalidate();
    return ok({ id: u.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function deleteAdminTask(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionAdmin();
    await prisma.adminTask.update({ where: { id }, data: { isDeleted: true } });
    await logAudit(prisma, { entity: "AdminTask", entityId: id, action: "delete", userId: user.id, changes: [{ field: "isDeleted", oldValue: false, newValue: true }] });
    revalidate();
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

/** Copies a pipeline row into the administrative tasks (the row itself is untouched). */
export async function duplicateOpportunityAsAdminTask(opportunityId: string, category?: z.input<typeof CATEGORY>): Promise<ActionResult<{ id: string; existed: boolean }>> {
  try {
    const user = await actionUser();
    const existing = await prisma.adminTask.findUnique({ where: { sourceOpportunityId: opportunityId } });
    if (existing) return ok({ id: existing.id, existed: true });
    const opp = await prisma.opportunity.findFirst({
      where: { id: opportunityId, isDeleted: false },
      include: { status: true, assignees: { select: { userId: true } }, activities: { where: { type: { in: ["LEGACY_STATUS", "LEGACY_FEEDBACK", "NOTE", "MEETING_SNAPSHOT"] } }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
    });
    if (!opp) return fail("Oportunidade não encontrada.");
    const status = opp.status.group === "CONCLUDED" ? "DONE" : opp.status.group === "CLOSED" ? "CANCELED" : opp.status.group === "ON_HOLD" ? "WAITING" : "IN_PROGRESS";
    const updates = opp.activities.filter((a) => (a.body ?? "").trim()).map((a) => ({ body: (a.body ?? "").trim(), occurredAt: a.occurredAt, isLegacy: a.isLegacy }));
    const task = await prisma.adminTask.create({
      data: {
        title: opp.name,
        description: opp.closeReason || opp.legacyFeedback || opp.description || null,
        category: category ?? "INTERNO_OUTRO",
        status,
        counterpart: opp.originatorRaw ?? null,
        sourceOpportunityId: opp.id,
        sourceLegacyId: opp.legacyId,
        completedAt: status === "DONE" || status === "CANCELED" ? opp.closedAt ?? opp.exitDate ?? new Date() : null,
        lastActivityAt: opp.lastActivityAt ?? opp.updatedAt,
        createdById: user.id,
        assignees: { create: opp.assignees.map((a) => ({ userId: a.userId })) },
        updates: { create: updates },
      },
    });
    await logAudit(prisma, { entity: "AdminTask", entityId: task.id, opportunityId: opp.id, action: "create", userId: user.id, changes: [{ field: "sourceOpportunityId", oldValue: null, newValue: opp.id }] });
    revalidate();
    return ok({ id: task.id, existed: false });
  } catch (e) {
    return fail(errorMessage(e));
  }
}
