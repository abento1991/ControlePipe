"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { actionUser } from "../session";
import { logAudit } from "../audit";
import { ok, fail, errorMessage, type ActionResult } from "./result";

async function touch(opportunityId: string, at: Date) {
  await prisma.opportunity.updateMany({ where: { id: opportunityId, OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: at } }] }, data: { lastActivityAt: at } });
  const orig = await prisma.opportunityOriginator.findFirst({ where: { opportunityId, role: "PRIMARY" } });
  if (orig?.companyId) await prisma.company.updateMany({ where: { id: orig.companyId, OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: at } }] }, data: { lastInteractionAt: at } });
  if (orig?.contactId) await prisma.contact.updateMany({ where: { id: orig.contactId, OR: [{ lastContactAt: null }, { lastContactAt: { lt: at } }] }, data: { lastContactAt: at } });
}

export async function addNote(opportunityId: string, body: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const text = body.trim();
    if (!text) return fail("Escreva a nota.");
    const now = new Date();
    const note = await prisma.note.create({ data: { opportunityId, body: text, userId: user.id } });
    await prisma.activity.create({ data: { opportunityId, type: "NOTE", title: "Nota adicionada", body: text, occurredAt: now, userId: user.id, metadata: { noteId: note.id } } });
    await touch(opportunityId, now);
    revalidatePath(`/opportunities/${opportunityId}`);
    return ok({ id: note.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const activitySchema = z.object({
  type: z.enum(["NOTE", "EMAIL", "WHATSAPP", "MEETING", "CALL", "INFO_RECEIVED", "PROPOSAL_SENT"]),
  title: z.string().trim().optional().nullable(),
  body: z.string().trim().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  nextAction: z.string().trim().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
});

export async function addActivity(opportunityId: string, input: z.input<typeof activitySchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.");
    const d = parsed.data;
    if (!d.title && !d.body) return fail("Informe um título ou descrição.");
    const occurredAt = d.occurredAt ? new Date(d.occurredAt) : new Date();
    const activity = await prisma.activity.create({ data: { opportunityId, type: d.type, title: d.title || null, body: d.body || null, occurredAt, userId: user.id } });
    if (d.nextAction !== undefined || d.nextFollowUpAt !== undefined) {
      const before = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { nextAction: true, nextFollowUpAt: true } });
      const nextFollowUpAt = d.nextFollowUpAt ? new Date(`${d.nextFollowUpAt}T00:00:00Z`) : d.nextFollowUpAt === null ? null : undefined;
      await prisma.opportunity.update({ where: { id: opportunityId }, data: { nextAction: d.nextAction ?? undefined, nextFollowUpAt } });
      await logAudit(null, { entity: "Opportunity", entityId: opportunityId, opportunityId, action: "update", userId: user.id, changes: [{ field: "nextAction", oldValue: before?.nextAction, newValue: d.nextAction ?? before?.nextAction }, { field: "nextFollowUpAt", oldValue: before?.nextFollowUpAt, newValue: nextFollowUpAt === undefined ? before?.nextFollowUpAt : nextFollowUpAt }] });
      if (d.nextFollowUpAt && d.nextAction) await prisma.followUp.create({ data: { opportunityId, dueAt: new Date(`${d.nextFollowUpAt}T00:00:00Z`), action: d.nextAction, userId: user.id } });
    }
    await touch(opportunityId, occurredAt);
    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/dashboard");
    return ok({ id: activity.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function completeFollowUp(followUpId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const fu = await prisma.followUp.update({ where: { id: followUpId }, data: { completedAt: new Date() } });
    await prisma.activity.create({ data: { opportunityId: fu.opportunityId, type: "FOLLOW_UP", title: "Follow-up concluído", body: fu.action, occurredAt: new Date(), userId: user.id } });
    const next = await prisma.followUp.findFirst({ where: { opportunityId: fu.opportunityId, completedAt: null }, orderBy: { dueAt: "asc" } });
    await prisma.opportunity.update({ where: { id: fu.opportunityId }, data: { nextFollowUpAt: next?.dueAt ?? null, nextAction: next?.action ?? null, lastActivityAt: new Date() } });
    revalidatePath(`/opportunities/${fu.opportunityId}`);
    revalidatePath("/dashboard");
    return ok({ id: fu.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function addAttachmentRecord(opportunityId: string, input: { kind: string; fileName: string; url?: string | null; mimeType?: string | null }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    if (!input.fileName.trim()) return fail("Informe o nome do arquivo.");
    const att = await prisma.attachment.create({ data: { opportunityId, kind: input.kind as "OTHER", fileName: input.fileName.trim(), url: input.url || null, mimeType: input.mimeType || null, userId: user.id } });
    revalidatePath(`/opportunities/${opportunityId}`);
    return ok({ id: att.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function deleteAttachment(id: string): Promise<ActionResult<undefined>> {
  try {
    await actionUser();
    const att = await prisma.attachment.delete({ where: { id } });
    revalidatePath(`/opportunities/${att.opportunityId}`);
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}

/** Quick dated update from the pipe table — the modern equivalent of a "dd/mm - texto" line in the old sheet. */
export async function addUpdate(opportunityId: string, text: string, dateISO?: string | null): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const body = text.trim();
    if (!body) return fail("Escreva a atualização.");
    const occurredAt = dateISO ? new Date(`${dateISO}T12:00:00Z`) : new Date();
    const a = await prisma.activity.create({ data: { opportunityId, type: "NOTE", title: "Atualização", body, occurredAt, userId: user.id } });
    await touch(opportunityId, occurredAt);
    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/pipeline");
    revalidatePath("/opportunities");
    revalidatePath("/on-hold");
    return ok({ id: a.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}
