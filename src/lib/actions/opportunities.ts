"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { actionUser, actionAdmin } from "../session";
import { logAudit, diffFields } from "../audit";
import { ok, fail, errorMessage, type ActionResult } from "./result";

const dateField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null));

const opportunitySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da oportunidade."),
  economicGroup: z.string().trim().optional().nullable(),
  operationTypeId: z.string().optional().nullable(),
  entryDate: dateField,
  amount: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  entryChannel: z.enum(["EMAIL", "WHATSAPP", "LIGACAO", "REUNIAO", "INDICACAO", "ORIGINACAO_PROPRIA", "OUTRO"]).optional().nullable(),
  emailSubject: z.string().trim().optional().nullable(),
  emailSender: z.string().trim().optional().nullable(),
  emailDate: dateField,
  whatsappContact: z.string().trim().optional().nullable(),
  whatsappNumber: z.string().trim().optional().nullable(),
  whatsappSummary: z.string().trim().optional().nullable(),
  firstContactAt: dateField,
  description: z.string().trim().optional().nullable(),
  sector: z.string().trim().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  statusKey: z.string().default("NEW"),
  nextAction: z.string().trim().optional().nullable(),
  nextFollowUpAt: dateField,
});

export type OpportunityInput = z.input<typeof opportunitySchema>;

type OpportunityData = z.output<typeof opportunitySchema>;
type Validation = { ok: true; data: OpportunityData } | { ok: false; error: string; fieldErrors: Record<string, string[]> };

function validate(input: unknown): Validation {
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", fieldErrors };
  }
  if (parsed.data.entryChannel === "EMAIL" && !parsed.data.emailSubject) {
    return { ok: false, error: "Informe o assunto do e-mail.", fieldErrors: { emailSubject: ["Obrigatório quando o canal é E-mail."] } };
  }
  return { ok: true, data: parsed.data };
}

function revalidateAll(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/on-hold");
  revalidatePath("/opportunities");
  revalidatePath("/originators");
  revalidatePath("/companies");
  revalidatePath("/reports");
  if (id) revalidatePath(`/opportunities/${id}`);
}

async function touchOriginatorDates(companyId?: string | null, contactId?: string | null, at: Date = new Date()) {
  if (companyId) await prisma.company.updateMany({ where: { id: companyId, OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: at } }] }, data: { lastInteractionAt: at } });
  if (contactId) await prisma.contact.updateMany({ where: { id: contactId, OR: [{ lastContactAt: null }, { lastContactAt: { lt: at } }] }, data: { lastContactAt: at } });
}

export async function createOpportunity(input: OpportunityInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const v = validate(input);
    if (!v.ok) return fail(v.error, v.fieldErrors);
    const d = v.data;
    const status = await prisma.opportunityStatus.findUnique({ where: { key: d.statusKey ?? "NEW" } });
    if (!status) return fail("Status inválido.");
    const company = d.companyId ? await prisma.company.findUnique({ where: { id: d.companyId }, select: { category: true } }) : null;
    const now = new Date();
    const entryDate = d.entryDate ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const created = await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.create({
        data: {
          name: d.name,
          economicGroup: d.economicGroup || null,
          operationTypeId: d.operationTypeId || null,
          statusId: status.id,
          entryDate,
          entryYear: entryDate.getUTCFullYear(),
          amount: d.amount,
          entryChannel: d.entryChannel ?? null,
          emailSubject: d.emailSubject || null,
          emailSender: d.emailSender || null,
          emailDate: d.emailDate,
          whatsappContact: d.whatsappContact || null,
          whatsappNumber: d.whatsappNumber || null,
          whatsappSummary: d.whatsappSummary || null,
          firstContactAt: d.firstContactAt ?? entryDate,
          description: d.description || null,
          sector: d.sector || null,
          nextAction: d.nextAction || null,
          nextFollowUpAt: d.nextFollowUpAt,
          originatorCategory: company?.category ?? (d.entryChannel === "ORIGINACAO_PROPRIA" ? "ORIGINACAO_PROPRIA" : null),
          lastActivityAt: now,
          createdById: user.id,
          assignees: { create: d.assigneeIds.map((userId, i) => ({ userId, isPrimary: i === 0 })) },
          originators: d.companyId || d.contactId ? { create: { role: "PRIMARY", companyId: d.companyId || null, contactId: d.contactId || null, confidence: 1 } } : undefined,
          activities: {
            create: [
              { type: "CREATED", title: "Oportunidade criada", body: d.description || null, occurredAt: now, userId: user.id },
              ...(d.entryChannel === "EMAIL" ? [{ type: "EMAIL" as const, title: `E-mail recebido: ${d.emailSubject}`, body: d.emailSender ? `De: ${d.emailSender}` : null, occurredAt: d.emailDate ?? entryDate, userId: user.id }] : []),
              ...(d.entryChannel === "WHATSAPP" ? [{ type: "WHATSAPP" as const, title: `WhatsApp${d.whatsappContact ? ` de ${d.whatsappContact}` : ""}`, body: d.whatsappSummary || null, occurredAt: entryDate, userId: user.id }] : []),
            ],
          },
          followUps: d.nextFollowUpAt && d.nextAction ? { create: { dueAt: d.nextFollowUpAt, action: d.nextAction, userId: user.id } } : undefined,
        },
      });
      await logAudit(tx, { entity: "Opportunity", entityId: opp.id, opportunityId: opp.id, action: "create", userId: user.id, changes: [{ field: "name", oldValue: null, newValue: d.name }, { field: "status", oldValue: null, newValue: status.key }, { field: "assignees", oldValue: null, newValue: d.assigneeIds }] });
      return opp;
    });
    await touchOriginatorDates(d.companyId, d.contactId, now);
    revalidateAll(created.id);
    return ok({ id: created.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function updateOpportunity(id: string, input: OpportunityInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const v = validate(input);
    if (!v.ok) return fail(v.error, v.fieldErrors);
    const d = v.data;
    const before = await prisma.opportunity.findUnique({ where: { id }, include: { status: true, assignees: true, originators: { where: { role: "PRIMARY" } } } });
    if (!before || before.isDeleted) return fail("Oportunidade não encontrada.");
    const status = await prisma.opportunityStatus.findUnique({ where: { key: d.statusKey ?? "NEW" } });
    if (!status) return fail("Status inválido.");
    const company = d.companyId ? await prisma.company.findUnique({ where: { id: d.companyId }, select: { category: true } }) : null;
    const now = new Date();
    const prevAssignees = before.assignees.map((a) => a.userId).sort();
    const nextAssignees = [...d.assigneeIds].sort();
    const prevOrig = before.originators[0];

    await prisma.$transaction(async (tx) => {
      const data: Prisma.OpportunityUncheckedUpdateInput = {
        name: d.name,
        economicGroup: d.economicGroup || null,
        operationTypeId: d.operationTypeId || null,
        statusId: status.id,
        entryDate: d.entryDate ?? before.entryDate,
        entryYear: (d.entryDate ?? before.entryDate)?.getUTCFullYear() ?? before.entryYear,
        amount: d.amount,
        entryChannel: d.entryChannel ?? null,
        emailSubject: d.emailSubject || null,
        emailSender: d.emailSender || null,
        emailDate: d.emailDate,
        whatsappContact: d.whatsappContact || null,
        whatsappNumber: d.whatsappNumber || null,
        whatsappSummary: d.whatsappSummary || null,
        firstContactAt: d.firstContactAt,
        description: d.description || null,
        sector: d.sector || null,
        nextAction: d.nextAction || null,
        nextFollowUpAt: d.nextFollowUpAt,
        originatorCategory: company?.category ?? before.originatorCategory,
        lastActivityAt: now,
      };
      if (status.group === "CONCLUDED" || status.group === "CLOSED") {
        if (before.status.group !== status.group) data.closedAt = now;
      } else {
        data.closedAt = null;
      }
      await tx.opportunity.update({ where: { id }, data });
      const changes = diffFields(
        { name: before.name, economicGroup: before.economicGroup, operationTypeId: before.operationTypeId, status: before.status.key, entryDate: before.entryDate, amount: before.amount === null ? null : Number(before.amount), entryChannel: before.entryChannel, emailSubject: before.emailSubject, description: before.description, sector: before.sector, nextAction: before.nextAction, nextFollowUpAt: before.nextFollowUpAt, assignees: prevAssignees, companyId: prevOrig?.companyId ?? null, contactId: prevOrig?.contactId ?? null },
        { name: d.name, economicGroup: d.economicGroup || null, operationTypeId: d.operationTypeId || null, status: status.key, entryDate: d.entryDate ?? before.entryDate, amount: d.amount, entryChannel: d.entryChannel ?? null, emailSubject: d.emailSubject || null, description: d.description || null, sector: d.sector || null, nextAction: d.nextAction || null, nextFollowUpAt: d.nextFollowUpAt, assignees: nextAssignees, companyId: d.companyId || null, contactId: d.contactId || null },
        ["name", "economicGroup", "operationTypeId", "status", "entryDate", "amount", "entryChannel", "emailSubject", "description", "sector", "nextAction", "nextFollowUpAt", "assignees", "companyId", "contactId"],
      );
      await logAudit(tx, { entity: "Opportunity", entityId: id, opportunityId: id, action: "update", userId: user.id, changes });

      if (JSON.stringify(prevAssignees) !== JSON.stringify(nextAssignees)) {
        await tx.opportunityAssignee.deleteMany({ where: { opportunityId: id } });
        await tx.opportunityAssignee.createMany({ data: d.assigneeIds.map((userId, i) => ({ opportunityId: id, userId, isPrimary: i === 0 })) });
        const names = await tx.user.findMany({ where: { id: { in: d.assigneeIds } }, select: { name: true } });
        await tx.activity.create({ data: { opportunityId: id, type: "ASSIGNEE_CHANGED", title: "Responsáveis alterados", body: names.map((n) => n.name).join(", ") || "Sem responsável", occurredAt: now, userId: user.id } });
      }
      if (before.status.key !== status.key) {
        await tx.activity.create({ data: { opportunityId: id, type: status.group === "CONCLUDED" || status.group === "CLOSED" ? "CLOSED" : "STATUS_CHANGED", title: `Status: ${before.status.name} → ${status.name}`, occurredAt: now, userId: user.id, metadata: { from: before.status.key, to: status.key } } });
      }
      if ((prevOrig?.companyId ?? null) !== (d.companyId || null) || (prevOrig?.contactId ?? null) !== (d.contactId || null)) {
        if (d.companyId || d.contactId) {
          await tx.opportunityOriginator.upsert({ where: { opportunityId_role: { opportunityId: id, role: "PRIMARY" } }, update: { companyId: d.companyId || null, contactId: d.contactId || null, needsReview: false, confidence: 1, migrationNotes: prevOrig?.migrationNotes ? `${prevOrig.migrationNotes}; corrigido manualmente` : "definido manualmente" }, create: { opportunityId: id, role: "PRIMARY", companyId: d.companyId || null, contactId: d.contactId || null, confidence: 1 } });
        } else if (prevOrig) {
          await tx.opportunityOriginator.update({ where: { id: prevOrig.id }, data: { companyId: null, contactId: null } });
        }
      }
    });
    await touchOriginatorDates(d.companyId, d.contactId, now);
    revalidateAll(id);
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const quickSchema = z.object({
  statusKey: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  nextAction: z.string().nullable().optional(),
  nextFollowUpAt: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string(), z.null()]).optional(),
});

/** Inline edits from tables (status, assignees, next action, follow-up date). */
export async function quickUpdateOpportunity(id: string, input: z.input<typeof quickSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const parsed = quickSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.");
    const d = parsed.data;
    const before = await prisma.opportunity.findUnique({ where: { id }, include: { status: true, assignees: true } });
    if (!before || before.isDeleted) return fail("Oportunidade não encontrada.");
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const data: Prisma.OpportunityUncheckedUpdateInput = { lastActivityAt: now };
      const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
      if (d.statusKey !== undefined && d.statusKey !== before.status.key) {
        const status = await tx.opportunityStatus.findUnique({ where: { key: d.statusKey } });
        if (!status) throw new Error("Status inválido.");
        data.statusId = status.id;
        data.closedAt = status.group === "CONCLUDED" || status.group === "CLOSED" ? now : null;
        changes.push({ field: "status", oldValue: before.status.key, newValue: status.key });
        const wasClosed = before.status.group === "CLOSED" || before.status.group === "ON_HOLD" || before.status.group === "CONCLUDED";
        const reopen = wasClosed && status.group === "ACTIVE";
        await tx.activity.create({ data: { opportunityId: id, type: reopen ? "REACTIVATED" : status.group === "CONCLUDED" || status.group === "CLOSED" ? "CLOSED" : "STATUS_CHANGED", title: `${reopen ? "Reativada — " : ""}Status: ${before.status.name} → ${status.name}`, occurredAt: now, userId: user.id, metadata: { from: before.status.key, to: status.key } } });
      }
      if (d.nextAction !== undefined) {
        data.nextAction = d.nextAction || null;
        changes.push({ field: "nextAction", oldValue: before.nextAction, newValue: d.nextAction || null });
      }
      if (d.nextFollowUpAt !== undefined) {
        const dt = d.nextFollowUpAt ? new Date(`${d.nextFollowUpAt}T00:00:00Z`) : null;
        data.nextFollowUpAt = dt;
        changes.push({ field: "nextFollowUpAt", oldValue: before.nextFollowUpAt, newValue: dt });
      }
      if (d.amount !== undefined) {
        const n = d.amount === null || d.amount === "" ? null : typeof d.amount === "number" ? d.amount : parseFloat(String(d.amount).replace(",", "."));
        data.amount = n !== null && Number.isFinite(n) ? n : null;
        changes.push({ field: "amount", oldValue: before.amount === null ? null : Number(before.amount), newValue: data.amount });
      }
      await tx.opportunity.update({ where: { id }, data });
      if (d.assigneeIds) {
        const prev = before.assignees.map((a) => a.userId).sort();
        const next = [...d.assigneeIds].sort();
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          await tx.opportunityAssignee.deleteMany({ where: { opportunityId: id } });
          await tx.opportunityAssignee.createMany({ data: d.assigneeIds.map((userId, i) => ({ opportunityId: id, userId, isPrimary: i === 0 })) });
          const names = await tx.user.findMany({ where: { id: { in: d.assigneeIds } }, select: { name: true } });
          await tx.activity.create({ data: { opportunityId: id, type: "ASSIGNEE_CHANGED", title: "Responsáveis alterados", body: names.map((n) => n.name).join(", ") || "Sem responsável", occurredAt: now, userId: user.id } });
          changes.push({ field: "assignees", oldValue: prev, newValue: next });
        }
      }
      await logAudit(tx, { entity: "Opportunity", entityId: id, opportunityId: id, action: "update", userId: user.id, changes });
    });
    revalidateAll(id);
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

/** Reactivates an On Hold / closed opportunity with a full audit trail. */
export async function reactivateOpportunity(id: string, targetStatusKey = "ANALYSIS", note?: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const before = await prisma.opportunity.findUnique({ where: { id }, include: { status: true } });
    if (!before || before.isDeleted) return fail("Oportunidade não encontrada.");
    const target = await prisma.opportunityStatus.findUnique({ where: { key: targetStatusKey } });
    if (!target || target.group !== "ACTIVE") return fail("Status de destino inválido.");
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.opportunity.update({ where: { id }, data: { statusId: target.id, closedAt: null, closeReason: null, lastActivityAt: now } });
      await tx.activity.create({ data: { opportunityId: id, type: "REACTIVATED", title: `Reativada: ${before.status.name} → ${target.name}`, body: note || null, occurredAt: now, userId: user.id, metadata: { from: before.status.key, to: target.key, previousGroup: before.status.group } } });
      await logAudit(tx, { entity: "Opportunity", entityId: id, opportunityId: id, action: "reactivate", userId: user.id, changes: [{ field: "status", oldValue: before.status.key, newValue: target.key }] });
    });
    revalidateAll(id);
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function closeOpportunity(id: string, statusKey: "DECLINED" | "INACTIVE" | "CONCLUDED" | "ON_HOLD", reason?: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const before = await prisma.opportunity.findUnique({ where: { id }, include: { status: true } });
    if (!before || before.isDeleted) return fail("Oportunidade não encontrada.");
    const target = await prisma.opportunityStatus.findUnique({ where: { key: statusKey } });
    if (!target) return fail("Status inválido.");
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const closing = target.group === "CLOSED" || target.group === "CONCLUDED";
      await tx.opportunity.update({ where: { id }, data: { statusId: target.id, closedAt: closing ? now : null, closeReason: reason || null, exitDate: closing ? before.exitDate ?? now : before.exitDate, lastActivityAt: now } });
      await tx.activity.create({ data: { opportunityId: id, type: closing ? "CLOSED" : "STATUS_CHANGED", title: `${target.name}: ${before.status.name} → ${target.name}`, body: reason || null, occurredAt: now, userId: user.id, metadata: { from: before.status.key, to: target.key } } });
      await logAudit(tx, { entity: "Opportunity", entityId: id, opportunityId: id, action: closing ? "close" : "update", userId: user.id, changes: [{ field: "status", oldValue: before.status.key, newValue: target.key }, { field: "closeReason", oldValue: before.closeReason, newValue: reason || null }] });
    });
    revalidateAll(id);
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function bulkUpdateOpportunities(ids: string[], input: { statusKey?: string; addAssigneeIds?: string[]; nextFollowUpAt?: string | null }): Promise<ActionResult<{ count: number }>> {
  try {
    await actionUser();
    let count = 0;
    for (const id of ids) {
      const current = input.addAssigneeIds?.length ? await prisma.opportunityAssignee.findMany({ where: { opportunityId: id }, select: { userId: true } }) : null;
      const merged = current ? Array.from(new Set([...current.map((c) => c.userId), ...(input.addAssigneeIds ?? [])])) : undefined;
      const res = await quickUpdateOpportunity(id, { statusKey: input.statusKey, assigneeIds: merged, nextFollowUpAt: input.nextFollowUpAt });
      if (res.ok) count++;
    }
    revalidateAll();
    return ok({ count });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function deleteOpportunity(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionAdmin();
    await prisma.$transaction(async (tx) => {
      await tx.opportunity.update({ where: { id }, data: { isDeleted: true } });
      await logAudit(tx, { entity: "Opportunity", entityId: id, opportunityId: id, action: "delete", userId: user.id, changes: [{ field: "isDeleted", oldValue: false, newValue: true }] });
    });
    revalidateAll();
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}
