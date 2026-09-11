import { describe, expect, it, beforeAll } from "vitest";
import { testPrisma, hasWorkbook, WORKBOOK } from "../helpers";
import { importPipeline } from "@/lib/import/importer";

const prisma = testPrisma();
const d = hasWorkbook ? describe : describe.skip;

d("workbook import", () => {
  beforeAll(async () => {
    // global setup already imported once; nothing else needed
  });

  it("preserves every Pipe row (sanity counts from the workbook)", async () => {
    const total = await prisma.opportunity.count({ where: { legacyId: { not: null } } });
    expect(total).toBeGreaterThanOrEqual(900);
    expect(total).toBeLessThanOrEqual(920);
    const ids = await prisma.opportunity.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true }, orderBy: { legacyId: "asc" } });
    expect(ids[0].legacyId).toBe(1);
    expect(new Set(ids.map((i) => i.legacyId)).size).toBe(ids.length);
  });

  it("normalizes decisions with the expected distribution", async () => {
    const rows = await prisma.opportunity.groupBy({ by: ["statusId"], _count: true });
    const statuses = await prisma.opportunityStatus.findMany();
    const byKey = Object.fromEntries(rows.map((r) => [statuses.find((s) => s.id === r.statusId)!.key, r._count]));
    expect(byKey.DECLINED).toBeGreaterThanOrEqual(700);
    expect(byKey.ON_HOLD).toBeGreaterThanOrEqual(90);
    expect(byKey.ANALYSIS).toBeGreaterThanOrEqual(30);
    expect(byKey.CONCLUDED).toBeGreaterThanOrEqual(20);
    expect(byKey.LEGACY_UNCLASSIFIED ?? 0).toBeLessThan(10);
  });

  it("computes years from the entry date and flags invalid years instead of fixing them", async () => {
    const byYear = await prisma.opportunity.groupBy({ by: ["entryYear"], _count: true });
    const map = Object.fromEntries(byYear.map((r) => [String(r.entryYear), r._count]));
    expect(map["2024"]).toBeGreaterThanOrEqual(230);
    expect(map["2025"]).toBeGreaterThanOrEqual(360);
    expect(map["2026"]).toBeGreaterThanOrEqual(250);
    const invalid = await prisma.dataQualityIssue.count({ where: { code: "INVALID_YEAR", resolved: false } });
    expect(invalid).toBeGreaterThan(10);
    const raw1900 = await prisma.opportunity.count({ where: { entryYearRaw: "1900" } });
    expect(raw1900).toBeGreaterThan(10);
  });

  it("keeps raw values next to normalized ones", async () => {
    const o = await prisma.opportunity.findFirst({ where: { operationTypeRaw: "Precatorio Estadual" }, include: { operationType: true } });
    expect(o).not.toBeNull();
    expect(o!.operationType!.slug).toBe("precatorio-estadual");
    expect(o!.operationTypeRaw).toBe("Precatorio Estadual");
    const rows = await prisma.importRow.count({ where: { sheet: "Pipe" } });
    expect(rows).toBeGreaterThanOrEqual(900);
    const anyRow = await prisma.importRow.findFirst({ where: { sheet: "Pipe", legacyId: 1 } });
    expect((anyRow!.rawData as Record<string, unknown>).E).toBeTruthy();
  });

  it("splits combined responsibles into multiple assignees and preserves the raw cell", async () => {
    const o = await prisma.opportunity.findFirst({ where: { assigneesRaw: "Christopher/Antonio" }, include: { assignees: { include: { user: true } } } });
    expect(o).not.toBeNull();
    const names = o!.assignees.map((a) => a.user.name).sort();
    expect(names).toEqual(["Antônio Penido", "Christopher Soares"]);
    const hugo = await prisma.opportunity.findFirst({ where: { assigneesRaw: "Hugo" }, include: { assignees: { include: { user: true } } } });
    expect(hugo!.assignees[0].user.isArchived).toBe(true);
    const todos = await prisma.opportunity.findFirst({ where: { assigneesRaw: "Todos" }, include: { assignees: true, issues: true } });
    expect(todos!.assignees).toHaveLength(0);
    expect(todos!.issues.some((i) => i.code === "ASSIGNEE_UNMAPPED")).toBe(true);
  });

  it("separates company and person originators", async () => {
    const o = await prisma.opportunity.findFirst({ where: { originatorRaw: "Raphael Martins (Souto Correa)" }, include: { originators: { include: { company: true, contact: true } } } });
    expect(o).not.toBeNull();
    expect(o!.originators[0].contact!.fullName).toBe("Raphael Martins");
    expect(o!.originators[0].company!.name).toBe("Souto Correa");
    const am = await prisma.company.findUnique({ where: { normalizedName: "alvarez & marsal" } });
    expect(am).not.toBeNull();
    expect(am!.category).toBe("CONSULTORIA");
  });

  it("creates timeline entries from the legacy status text", async () => {
    const candidates = await prisma.opportunity.findMany({ where: { legacyStatusText: { contains: "\n" } }, include: { activities: true }, take: 50 });
    expect(candidates.length).toBeGreaterThan(10);
    const multi = candidates.filter((o) => o.activities.filter((a) => a.type === "LEGACY_STATUS").length > 1);
    expect(multi.length).toBeGreaterThan(5);
    const dated = multi[0].activities.filter((a) => a.type === "LEGACY_STATUS" && (a.metadata as Record<string, unknown>).hasDate === true);
    expect(dated.length).toBeGreaterThan(0);
    expect(multi[0].activities.every((a) => a.isLegacy)).toBe(true);
  });

  it("records possible duplicates without merging", async () => {
    const dup = await prisma.dataQualityIssue.findFirst({ where: { code: "POSSIBLE_DUPLICATE" } });
    expect(dup).not.toBeNull();
    const total = await prisma.opportunity.count();
    expect(total).toBeGreaterThanOrEqual(900);
  });

  it("is idempotent: a second run creates nothing", async () => {
    const before = { opps: await prisma.opportunity.count(), acts: await prisma.activity.count(), cos: await prisma.company.count(), cts: await prisma.contact.count() };
    const summary = await importPipeline(prisma, { filePath: WORKBOOK });
    expect(summary.created).toBe(0);
    expect(summary.errors).toBe(0);
    expect(summary.unchanged).toBe(summary.pipeRows);
    const after = { opps: await prisma.opportunity.count(), acts: await prisma.activity.count(), cos: await prisma.company.count(), cts: await prisma.contact.count() };
    expect(after).toEqual(before);
  });
});
