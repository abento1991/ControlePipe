import { describe, expect, it, vi, beforeAll } from "vitest";
import { testPrisma } from "../helpers";

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/db", async () => {
  const { testPrisma } = await import("../helpers");
  return { prisma: testPrisma(), default: testPrisma() };
});
let currentUser: { id: string; name: string; email: string; role: "ADMIN" | "USER"; initials: string; color: string | null };
vi.mock("@/lib/session", () => ({
  actionUser: async () => currentUser,
  actionAdmin: async () => {
    if (currentUser.role !== "ADMIN") throw new Error("forbidden");
    return currentUser;
  },
  getSessionUser: async () => currentUser,
  requireUser: async () => currentUser,
  requireAdmin: async () => currentUser,
}));

const prisma = testPrisma();

describe("opportunity actions", () => {
  beforeAll(async () => {
    const u = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    currentUser = { id: u.id, name: u.name, email: u.email, role: u.role, initials: u.initials ?? "", color: u.color };
  });

  it("creates an opportunity with multiple assignees, company, contact and e-mail channel", async () => {
    const { createOpportunity } = await import("@/lib/actions/opportunities");
    const { createCompany, createContact } = await import("@/lib/actions/originators");
    const users = await prisma.user.findMany({ where: { isArchived: false }, take: 2 });
    const company = await createCompany({ name: "Teste Capital Partners", category: "BOUTIQUE" });
    expect(company.ok).toBe(true);
    const contact = await createContact({ firstName: "Maria", lastName: "Teste", companyId: company.ok ? company.data.id : null, email: "maria@teste.com", whatsapp: "+55 11 99999-0000" });
    expect(contact.ok).toBe(true);
    const missingSubject = await createOpportunity({ name: "Projeto Teste", entryChannel: "EMAIL", assigneeIds: [], statusKey: "NEW" });
    expect(missingSubject.ok).toBe(false);
    const res = await createOpportunity({
      name: "Projeto Teste",
      entryChannel: "EMAIL",
      emailSubject: "RE: Oportunidade NPL",
      emailSender: "maria@teste.com",
      amount: "12,5",
      companyId: company.ok ? company.data.id : null,
      contactId: contact.ok ? contact.data.id : null,
      assigneeIds: users.map((u) => u.id),
      statusKey: "TRIAGE",
      nextAction: "Ler teaser",
      nextFollowUpAt: "2026-10-01",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const o = await prisma.opportunity.findUniqueOrThrow({ where: { id: res.data.id }, include: { assignees: true, originators: true, activities: true, status: true, auditLogs: true } });
    expect(o.assignees).toHaveLength(2);
    expect(Number(o.amount)).toBe(12.5);
    expect(o.originators[0].companyId).toBe(company.ok ? company.data.id : null);
    expect(o.originatorCategory).toBe("BOUTIQUE");
    expect(o.status.key).toBe("TRIAGE");
    expect(o.activities.some((a) => a.type === "EMAIL")).toBe(true);
    expect(o.auditLogs.length).toBeGreaterThan(0);
    expect(o.entryYear).toBe(new Date().getUTCFullYear());
  });

  it("quick-edits status/assignees and writes audit + timeline", async () => {
    const { quickUpdateOpportunity } = await import("@/lib/actions/opportunities");
    const o = await prisma.opportunity.findFirstOrThrow({ where: { name: "Projeto Teste" } });
    const user = await prisma.user.findFirstOrThrow({ where: { isArchived: false, role: "USER" } });
    const res = await quickUpdateOpportunity(o.id, { statusKey: "PROPOSAL_SENT", assigneeIds: [user.id], nextAction: "Aguardar resposta", nextFollowUpAt: "2026-10-15" });
    expect(res.ok).toBe(true);
    const after = await prisma.opportunity.findUniqueOrThrow({ where: { id: o.id }, include: { status: true, assignees: true, auditLogs: true, activities: true } });
    expect(after.status.key).toBe("PROPOSAL_SENT");
    expect(after.assignees.map((a) => a.userId)).toEqual([user.id]);
    expect(after.nextAction).toBe("Aguardar resposta");
    expect(after.auditLogs.some((l) => l.field === "status" && l.newValue === "PROPOSAL_SENT" && l.userId === currentUser.id)).toBe(true);
    expect(after.activities.some((a) => a.type === "STATUS_CHANGED")).toBe(true);
  });

  it("closes and reactivates with full trail", async () => {
    const { closeOpportunity, reactivateOpportunity } = await import("@/lib/actions/opportunities");
    const o = await prisma.opportunity.findFirstOrThrow({ where: { name: "Projeto Teste" } });
    expect((await closeOpportunity(o.id, "ON_HOLD", "Aguardando cliente")).ok).toBe(true);
    let cur = await prisma.opportunity.findUniqueOrThrow({ where: { id: o.id }, include: { status: true } });
    expect(cur.status.group).toBe("ON_HOLD");
    expect((await reactivateOpportunity(o.id, "ANALYSIS", "Cliente voltou")).ok).toBe(true);
    cur = await prisma.opportunity.findUniqueOrThrow({ where: { id: o.id }, include: { status: true, activities: true, auditLogs: true } });
    expect(cur.status.key).toBe("ANALYSIS");
    const react = cur.activities.find((a) => a.type === "REACTIVATED");
    expect(react).toBeTruthy();
    expect((react!.metadata as Record<string, unknown>).from).toBe("ON_HOLD");
    expect(react!.userId).toBe(currentUser.id);
    expect(cur.auditLogs.some((l) => l.action === "reactivate")).toBe(true);
    expect((await closeOpportunity(o.id, "DECLINED", "Sem garantia")).ok).toBe(true);
    cur = await prisma.opportunity.findUniqueOrThrow({ where: { id: o.id }, include: { status: true } });
    expect(cur.status.outcome).toBe("LOST");
    expect(cur.closedAt).not.toBeNull();
  });

  it("updates an opportunity and logs changed fields only", async () => {
    const { updateOpportunity } = await import("@/lib/actions/opportunities");
    const o = await prisma.opportunity.findFirstOrThrow({ where: { name: "Projeto Teste" }, include: { assignees: true } });
    const before = await prisma.auditLog.count({ where: { opportunityId: o.id } });
    const res = await updateOpportunity(o.id, { name: "Projeto Teste 2", amount: 20, assigneeIds: o.assignees.map((a) => a.userId), statusKey: "DECLINED", entryChannel: "WHATSAPP", whatsappContact: "Maria", whatsappSummary: "Mandou teaser" });
    expect(res.ok).toBe(true);
    const logs = await prisma.auditLog.findMany({ where: { opportunityId: o.id }, orderBy: { createdAt: "desc" }, take: 10 });
    expect(logs.length).toBeGreaterThan(before - 10);
    expect(logs.some((l) => l.field === "name" && l.newValue === "Projeto Teste 2")).toBe(true);
    expect(logs.some((l) => l.field === "amount" && l.newValue === "20")).toBe(true);
  });

  it("adds notes and activities that update lastActivityAt", async () => {
    const { addNote, addActivity } = await import("@/lib/actions/activities");
    const o = await prisma.opportunity.findFirstOrThrow({ where: { name: "Projeto Teste 2" } });
    expect((await addNote(o.id, "Garantias fracas, mas tese boa.")).ok).toBe(true);
    expect((await addActivity(o.id, { type: "MEETING", title: "Reunião com originador", body: "Alinhamento", nextAction: "Enviar NDA", nextFollowUpAt: "2026-11-01" })).ok).toBe(true);
    const cur = await prisma.opportunity.findUniqueOrThrow({ where: { id: o.id }, include: { notes: true, activities: true, followUps: true } });
    expect(cur.notes).toHaveLength(1);
    expect(cur.activities.some((a) => a.type === "MEETING")).toBe(true);
    expect(cur.nextAction).toBe("Enviar NDA");
    expect(cur.followUps.length).toBeGreaterThanOrEqual(1);
    expect(cur.followUps.some((f) => f.action === "Enviar NDA")).toBe(true);
    expect(cur.lastActivityAt).not.toBeNull();
  });

  it("admin can fix a type de/para and reclassify opportunities; users cannot", async () => {
    const { updateTypeMapping } = await import("@/lib/actions/admin");
    const mapping = await prisma.operationTypeMapping.findFirstOrThrow({ where: { rawValue: "Precatorio TO" } });
    const federal = await prisma.operationType.findUniqueOrThrow({ where: { slug: "precatorio-federal" } });
    const res = await updateTypeMapping(mapping.id, federal.id, true);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.updated).toBeGreaterThan(0);
    const opp = await prisma.opportunity.findFirstOrThrow({ where: { operationTypeRaw: "Precatorio TO" } });
    expect(opp.operationTypeId).toBe(federal.id);
    expect(opp.operationTypeRaw).toBe("Precatorio TO");
    const saved = await prisma.operationTypeMapping.findUniqueOrThrow({ where: { id: mapping.id } });
    expect(saved.source).toBe("manual");
    const admin = currentUser;
    currentUser = { ...admin, role: "USER" };
    const denied = await updateTypeMapping(mapping.id, federal.id, true);
    expect(denied.ok).toBe(false);
    currentUser = admin;
  });

  it("manual de/para survives a re-import", async () => {
    const { importPipeline } = await import("@/lib/import/importer");
    const { WORKBOOK, hasWorkbook } = await import("../helpers");
    if (!hasWorkbook) return;
    await importPipeline(prisma, { filePath: WORKBOOK });
    const saved = await prisma.operationTypeMapping.findFirstOrThrow({ where: { rawValue: "Precatorio TO" }, include: { operationType: true } });
    expect(saved.source).toBe("manual");
    expect(saved.operationType!.slug).toBe("precatorio-federal");
  });

  it("saves and lists views per page", async () => {
    const { saveView, listViews } = await import("@/lib/actions/saved-views");
    const res = await saveView({ name: "Precatórios 2026", page: "pipeline", filters: { years: "2026", typeCategories: "PRECATORIO_ESTADUAL" } });
    expect(res.ok).toBe(true);
    const views = await listViews("pipeline");
    expect(views.some((v) => v.name === "Precatórios 2026")).toBe(true);
  });
});
