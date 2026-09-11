"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { actionAdmin, actionUser } from "../session";
import { logAudit } from "../audit";
import { initialsOf } from "../normalization/text";
import { ok, fail, errorMessage, type ActionResult } from "./result";

export async function updateTypeMapping(mappingId: string, operationTypeId: string | null, applyToOpportunities = true): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await actionAdmin();
    const mapping = await prisma.operationTypeMapping.findUnique({ where: { id: mappingId }, include: { operationType: true } });
    if (!mapping) return fail("Mapeamento não encontrado.");
    const target = operationTypeId ? await prisma.operationType.findUnique({ where: { id: operationTypeId } }) : null;
    await prisma.operationTypeMapping.update({ where: { id: mappingId }, data: { operationTypeId: target?.id ?? null, normalizedKey: target?.slug ?? mapping.normalizedKey, source: "manual", confidence: 1, needsReview: false } });
    let updated = 0;
    if (applyToOpportunities && target) {
      const res = await prisma.opportunity.updateMany({ where: { operationTypeRaw: mapping.rawValue }, data: { operationTypeId: target.id } });
      updated = res.count;
      await prisma.dataQualityIssue.updateMany({ where: { code: { in: ["TYPE_UNNORMALIZED", "TYPE_SPHERE_INFERRED"] }, resolved: false, opportunity: { operationTypeRaw: mapping.rawValue } }, data: { resolved: true, resolvedAt: new Date(), resolvedById: user.id, resolutionNote: `De/para ajustado manualmente para ${target.name}` } });
    }
    await logAudit(null, { entity: "OperationTypeMapping", entityId: mappingId, action: "update", userId: user.id, changes: [{ field: "operationType", oldValue: mapping.operationType?.slug ?? null, newValue: target?.slug ?? null }] });
    revalidatePath("/admin/operation-types");
    revalidatePath("/admin/data-quality");
    return ok({ updated });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const typeSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string(),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function createOperationType(input: z.input<typeof typeSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    await actionAdmin();
    const parsed = typeSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.");
    const slug = parsed.data.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const t = await prisma.operationType.create({ data: { name: parsed.data.name, slug, category: parsed.data.category as "OUTROS", color: parsed.data.color || null, description: parsed.data.description || null, sortOrder: 500 } });
    revalidatePath("/admin/operation-types");
    return ok({ id: t.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function updateOperationType(id: string, input: z.input<typeof typeSchema> & { isActive?: boolean }): Promise<ActionResult<{ id: string }>> {
  try {
    await actionAdmin();
    const parsed = typeSchema.safeParse(input);
    if (!parsed.success) return fail("Dados inválidos.");
    await prisma.operationType.update({ where: { id }, data: { name: parsed.data.name, category: parsed.data.category as "OUTROS", color: parsed.data.color || null, description: parsed.data.description || null, ...(input.isActive !== undefined ? { isActive: input.isActive } : {}) } });
    revalidatePath("/admin/operation-types");
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  email: z.string().trim().toLowerCase().min(5, "Informe o e-mail."),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  password: z.string().min(8, "Senha com pelo menos 8 caracteres.").optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function upsertUser(id: string | null, input: z.input<typeof userSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await actionAdmin();
    const parsed = userSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const passwordHash = d.password ? await bcrypt.hash(d.password, 10) : undefined;
    if (id) {
      const before = await prisma.user.findUnique({ where: { id } });
      if (!before) return fail("Usuário não encontrado.");
      if (before.id === admin.id && d.role !== "ADMIN") return fail("Você não pode remover seu próprio perfil de administrador.");
      await prisma.user.update({ where: { id }, data: { name: d.name, email: d.email, role: d.role, initials: initialsOf(d.name), color: d.color || before.color, isActive: d.isActive ?? before.isActive, ...(passwordHash ? { passwordHash } : {}) } });
      await logAudit(null, { entity: "User", entityId: id, action: "update", userId: admin.id, changes: [{ field: "role", oldValue: before.role, newValue: d.role }, { field: "isActive", oldValue: before.isActive, newValue: d.isActive ?? before.isActive }, { field: "password", oldValue: null, newValue: passwordHash ? "reset" : null }] });
      revalidatePath("/admin/users");
      return ok({ id });
    }
    if (!passwordHash) return fail("Defina uma senha inicial.");
    const u = await prisma.user.create({ data: { name: d.name, email: d.email, role: d.role, initials: initialsOf(d.name), color: d.color || "#587f28", passwordHash } });
    await logAudit(null, { entity: "User", entityId: u.id, action: "create", userId: admin.id, changes: [{ field: "email", oldValue: null, newValue: d.email }] });
    revalidatePath("/admin/users");
    return ok({ id: u.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function changeOwnPassword(current: string, next: string): Promise<ActionResult<undefined>> {
  try {
    const user = await actionUser();
    if (next.length < 8) return fail("A nova senha precisa ter pelo menos 8 caracteres.");
    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u?.passwordHash || !(await bcrypt.compare(current, u.passwordHash))) return fail("Senha atual incorreta.");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function resolveIssue(id: string, note?: string): Promise<ActionResult<undefined>> {
  try {
    const user = await actionUser();
    const issue = await prisma.dataQualityIssue.update({ where: { id }, data: { resolved: true, resolvedAt: new Date(), resolvedById: user.id, resolutionNote: note || null } });
    if (issue.opportunityId) {
      const open = await prisma.dataQualityIssue.count({ where: { opportunityId: issue.opportunityId, resolved: false, severity: { not: "INFO" } } });
      if (open === 0) await prisma.opportunity.update({ where: { id: issue.opportunityId }, data: { needsReview: false } });
    }
    revalidatePath("/admin/data-quality");
    if (issue.opportunityId) revalidatePath(`/opportunities/${issue.opportunityId}`);
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function reopenIssue(id: string): Promise<ActionResult<undefined>> {
  try {
    await actionAdmin();
    const issue = await prisma.dataQualityIssue.update({ where: { id }, data: { resolved: false, resolvedAt: null, resolvedById: null } });
    if (issue.opportunityId && issue.severity !== "INFO") await prisma.opportunity.update({ where: { id: issue.opportunityId }, data: { needsReview: true } });
    revalidatePath("/admin/data-quality");
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function setOpportunityOriginator(opportunityId: string, companyId: string | null, contactId: string | null): Promise<ActionResult<undefined>> {
  try {
    const user = await actionUser();
    const before = await prisma.opportunityOriginator.findFirst({ where: { opportunityId, role: "PRIMARY" } });
    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId }, select: { category: true } }) : null;
    await prisma.opportunityOriginator.upsert({
      where: { opportunityId_role: { opportunityId, role: "PRIMARY" } },
      update: { companyId, contactId, needsReview: false, confidence: 1, migrationNotes: `${before?.migrationNotes ?? ""}; corrigido manualmente`.replace(/^; /, "") },
      create: { opportunityId, role: "PRIMARY", companyId, contactId, confidence: 1 },
    });
    if (company) await prisma.opportunity.update({ where: { id: opportunityId }, data: { originatorCategory: company.category } });
    await prisma.dataQualityIssue.updateMany({ where: { opportunityId, code: { in: ["ORIGINATOR_UNCLASSIFIED", "COMPANY_UNIDENTIFIED", "ORIGINATOR_MISSING"] }, resolved: false }, data: { resolved: true, resolvedAt: new Date(), resolvedById: user.id, resolutionNote: "Originador definido manualmente" } });
    await logAudit(null, { entity: "Opportunity", entityId: opportunityId, opportunityId, action: "update", userId: user.id, changes: [{ field: "companyId", oldValue: before?.companyId ?? null, newValue: companyId }, { field: "contactId", oldValue: before?.contactId ?? null, newValue: contactId }] });
    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/admin/data-quality");
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}
