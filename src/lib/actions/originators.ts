"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { actionUser } from "../session";
import { logAudit, diffFields } from "../audit";
import { normalizeKey } from "../normalization/text";
import { ok, fail, errorMessage, type ActionResult } from "./result";

const category = z.enum(["BANCO", "ASSET", "CONSULTORIA", "BOUTIQUE", "BROKER", "ESCRITORIO_ADVOCACIA", "EMPRESARIO_EXECUTIVO", "ADVISOR", "ORIGINACAO_PROPRIA", "FUNDO", "OUTROS"]);
const relationship = z.enum(["ESTRATEGICO", "ATIVO", "ESPORADICO", "FRIO", "NOVO"]);

const companySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa."),
  shortName: z.string().trim().optional().nullable(),
  category: category.default("OUTROS"),
  website: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  relationship: relationship.default("NOVO"),
});
export type CompanyInput = z.input<typeof companySchema>;

export async function createCompany(input: CompanyInput): Promise<ActionResult<{ id: string; name: string; category: string }>> {
  try {
    const user = await actionUser();
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const normalizedName = normalizeKey(d.name);
    const existing = await prisma.company.findUnique({ where: { normalizedName } });
    if (existing) return ok({ id: existing.id, name: existing.name, category: existing.category });
    const c = await prisma.company.create({ data: { ...d, shortName: d.shortName || null, website: d.website || null, address: d.address || null, notes: d.notes || null, normalizedName, migrationConfidence: 1 } });
    await logAudit(null, { entity: "Company", entityId: c.id, action: "create", userId: user.id, changes: [{ field: "name", oldValue: null, newValue: c.name }] });
    revalidatePath("/companies");
    revalidatePath("/originators");
    return ok({ id: c.id, name: c.name, category: c.category });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function updateCompany(id: string, input: CompanyInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const before = await prisma.company.findUnique({ where: { id } });
    if (!before) return fail("Empresa não encontrada.");
    const normalizedName = normalizeKey(d.name);
    const clash = await prisma.company.findFirst({ where: { normalizedName, id: { not: id } } });
    if (clash) return fail(`Já existe uma empresa chamada "${clash.name}".`);
    const data = { name: d.name, shortName: d.shortName || null, category: d.category, website: d.website || null, address: d.address || null, notes: d.notes || null, relationship: d.relationship, normalizedName, needsReview: false };
    await prisma.company.update({ where: { id }, data });
    if (before.category !== d.category) {
      // keep the opportunity-level category in sync for reports
      await prisma.opportunity.updateMany({ where: { originators: { some: { companyId: id, role: "PRIMARY" } } }, data: { originatorCategory: d.category } });
    }
    await logAudit(null, { entity: "Company", entityId: id, action: "update", userId: user.id, changes: diffFields(before as unknown as Record<string, unknown>, data, ["name", "shortName", "category", "website", "address", "notes", "relationship"]) });
    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
    revalidatePath("/originators");
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Informe o nome."),
  lastName: z.string().trim().optional().nullable(),
  companyId: z.string().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  linkedin: z.string().trim().optional().nullable(),
  category: category.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  relationship: relationship.default("NOVO"),
  nextFollowUpAt: z.string().optional().nullable(),
});
export type ContactInput = z.input<typeof contactSchema>;

export async function createContact(input: ContactInput): Promise<ActionResult<{ id: string; fullName: string; companyId: string | null }>> {
  try {
    const user = await actionUser();
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const fullName = [d.firstName, d.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const normalizedName = normalizeKey(fullName);
    const existing = await prisma.contact.findFirst({ where: { normalizedName, companyId: d.companyId || null } });
    if (existing) return ok({ id: existing.id, fullName: existing.fullName, companyId: existing.companyId });
    const c = await prisma.contact.create({
      data: { firstName: d.firstName, lastName: d.lastName || null, fullName, normalizedName, companyId: d.companyId || null, title: d.title || null, email: d.email || null, phone: d.phone || null, whatsapp: d.whatsapp || null, linkedin: d.linkedin || null, category: d.category ?? null, notes: d.notes || null, relationship: d.relationship, nextFollowUpAt: d.nextFollowUpAt ? new Date(`${d.nextFollowUpAt}T00:00:00Z`) : null, migrationConfidence: 1 },
    });
    await logAudit(null, { entity: "Contact", entityId: c.id, action: "create", userId: user.id, changes: [{ field: "fullName", oldValue: null, newValue: fullName }] });
    revalidatePath("/originators");
    return ok({ id: c.id, fullName: c.fullName, companyId: c.companyId });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function updateContact(id: string, input: ContactInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const d = parsed.data;
    const before = await prisma.contact.findUnique({ where: { id } });
    if (!before) return fail("Contato não encontrado.");
    const fullName = [d.firstName, d.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const data = { firstName: d.firstName, lastName: d.lastName || null, fullName, normalizedName: normalizeKey(fullName), companyId: d.companyId || null, title: d.title || null, email: d.email || null, phone: d.phone || null, whatsapp: d.whatsapp || null, linkedin: d.linkedin || null, category: d.category ?? null, notes: d.notes || null, relationship: d.relationship, nextFollowUpAt: d.nextFollowUpAt ? new Date(`${d.nextFollowUpAt}T00:00:00Z`) : null, needsReview: false };
    await prisma.contact.update({ where: { id }, data });
    await logAudit(null, { entity: "Contact", entityId: id, action: "update", userId: user.id, changes: diffFields(before as unknown as Record<string, unknown>, data, ["fullName", "companyId", "title", "email", "phone", "whatsapp", "linkedin", "category", "notes", "relationship", "nextFollowUpAt"]) });
    revalidatePath("/originators");
    revalidatePath(`/originators/${id}`);
    return ok({ id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function addInteraction(input: { contactId?: string | null; companyId?: string | null; type: string; summary: string; occurredAt?: string | null; nextFollowUpAt?: string | null }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    if (!input.summary.trim()) return fail("Descreva a interação.");
    if (!input.contactId && !input.companyId) return fail("Interação sem contato ou empresa.");
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    const it = await prisma.contactInteraction.create({ data: { contactId: input.contactId || null, companyId: input.companyId || null, type: input.type as "NOTA", summary: input.summary.trim(), occurredAt, userId: user.id } });
    if (input.contactId) {
      await prisma.contact.update({ where: { id: input.contactId }, data: { lastContactAt: occurredAt, ...(input.nextFollowUpAt !== undefined ? { nextFollowUpAt: input.nextFollowUpAt ? new Date(`${input.nextFollowUpAt}T00:00:00Z`) : null } : {}) } });
      const c = await prisma.contact.findUnique({ where: { id: input.contactId }, select: { companyId: true } });
      if (c?.companyId) await prisma.company.updateMany({ where: { id: c.companyId, OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: occurredAt } }] }, data: { lastInteractionAt: occurredAt } });
    }
    if (input.companyId) await prisma.company.updateMany({ where: { id: input.companyId, OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: occurredAt } }] }, data: { lastInteractionAt: occurredAt } });
    revalidatePath("/originators");
    if (input.contactId) revalidatePath(`/originators/${input.contactId}`);
    if (input.companyId) revalidatePath(`/companies/${input.companyId}`);
    return ok({ id: it.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

/** Merges duplicate contacts/companies (keeps `keepId`, re-points originations). */
export async function mergeCompanies(keepId: string, mergeId: string): Promise<ActionResult<undefined>> {
  try {
    const user = await actionUser();
    if (keepId === mergeId) return fail("Selecione empresas diferentes.");
    const merged = await prisma.company.findUnique({ where: { id: mergeId } });
    if (!merged) return fail("Empresa não encontrada.");
    await prisma.$transaction(async (tx) => {
      await tx.opportunityOriginator.updateMany({ where: { companyId: mergeId }, data: { companyId: keepId } });
      await tx.contact.updateMany({ where: { companyId: mergeId }, data: { companyId: keepId } });
      await tx.contactInteraction.updateMany({ where: { companyId: mergeId }, data: { companyId: keepId } });
      await tx.companyAlias.updateMany({ where: { companyId: mergeId }, data: { companyId: keepId } });
      await tx.companyAlias.create({ data: { alias: merged.name, companyId: keepId } }).catch(() => undefined);
      await tx.company.update({ where: { id: mergeId }, data: { isActive: false, migrationNotes: `${merged.migrationNotes ?? ""}; mesclada em ${keepId}` } });
      await logAudit(tx, { entity: "Company", entityId: keepId, action: "merge", userId: user.id, changes: [{ field: "mergedFrom", oldValue: null, newValue: merged.name }] });
    });
    revalidatePath("/companies");
    revalidatePath("/originators");
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}
