import { describe, expect, it, vi } from "vitest";
import { testPrisma, hasWorkbook } from "../helpers";

vi.mock("@/lib/db", async () => {
  const { testPrisma } = await import("../helpers");
  return { prisma: testPrisma(), default: testPrisma() };
});

const prisma = testPrisma();
const d = hasWorkbook ? describe : describe.skip;

d("queries & metrics", () => {
  it("lists active pipeline with server-side filters and pagination", async () => {
    const { listOpportunities } = await import("@/lib/queries/opportunities");
    const active = await listOpportunities({ filters: { groups: ["ACTIVE"] }, page: 1, pageSize: 10 });
    expect(active.total).toBeGreaterThanOrEqual(38);
    expect(active.rows.length).toBeLessThanOrEqual(10);
    expect(active.rows.every((r) => r.status.group === "ACTIVE")).toBe(true);
    expect(active.rows[0].daysInPipeline).not.toBeNull();
  });

  it("filters by assignee, year, type category, originator category and search", async () => {
    const { listOpportunities } = await import("@/lib/queries/opportunities");
    const luiza = await prisma.user.findFirstOrThrow({ where: { name: { contains: "Luiza" } } });
    const byAssignee = await listOpportunities({ filters: { assigneeIds: [luiza.id] } });
    expect(byAssignee.total).toBeGreaterThan(30);
    expect(byAssignee.rows.every((r) => r.assignees.some((a) => a.id === luiza.id))).toBe(true);
    const y2025 = await listOpportunities({ filters: { years: [2025] }, pageSize: 500 });
    expect(y2025.total).toBeGreaterThanOrEqual(360);
    expect(y2025.rows.every((r) => r.entryYear === 2025)).toBe(true);
    const prec = await listOpportunities({ filters: { typeCategories: ["PRECATORIO_ESTADUAL"] } });
    expect(prec.total).toBeGreaterThan(50);
    const brokers = await listOpportunities({ filters: { originatorCategories: ["BROKER"] } });
    expect(brokers.total).toBeGreaterThan(100);
    const search = await listOpportunities({ filters: { q: "Petrobras" } });
    expect(search.total).toBeGreaterThan(0);
    const byNumber = await listOpportunities({ filters: { q: "29" } });
    expect(byNumber.rows.some((r) => r.legacyId === 29)).toBe(true);
  });

  it("computes dashboard KPIs from the database", async () => {
    const { getDashboardData } = await import("@/lib/queries/dashboard");
    const data = await getDashboardData({});
    expect(data.kpi.total).toBeGreaterThanOrEqual(900);
    expect(data.kpi.active + data.kpi.onHold + data.kpi.concluded + data.kpi.declined).toBeLessThanOrEqual(data.kpi.total);
    expect(data.kpi.concluded).toBeGreaterThanOrEqual(20);
    expect(data.kpi.conversionRate).toBeGreaterThan(0);
    expect(data.kpi.conversionRate).toBeLessThan(0.2);
    expect(data.byMonth.length).toBeGreaterThan(24);
    expect(data.byType[0].count).toBeGreaterThan(100);
    expect(data.byCompany[0].label).toBe("JGP FA");
    expect(data.funnel[0].count).toBe(data.kpi.total);
    expect(data.aging.reduce((n, a) => n + a.count, 0)).toBe(data.kpi.active);
    const filtered = await getDashboardData({ years: [2024] });
    expect(filtered.kpi.total).toBeGreaterThanOrEqual(230);
    expect(filtered.kpi.total).toBeLessThan(300);
  });

  it("builds originator CRM aggregates", async () => {
    const { listContactsCrm, listCompaniesCrm } = await import("@/lib/queries/originators");
    const contacts = await listContactsCrm(2026);
    expect(contacts.length).toBeGreaterThan(100);
    const top = contacts[0];
    expect(top.casesTotal).toBeGreaterThan(5);
    expect(top.casesTotal).toBeGreaterThanOrEqual(top.casesYear);
    expect(top.casesTotal).toBeGreaterThanOrEqual(top.active + top.concluded);
    const companies = await listCompaniesCrm(2025);
    const jgp = companies.find((c) => c.name === "JGP FA")!;
    expect(jgp.casesTotal).toBeGreaterThan(100);
    expect(jgp.casesYear).toBeGreaterThan(30);
    expect(jgp.concluded).toBeGreaterThanOrEqual(1);
    expect(jgp.conversion).not.toBeNull();
  });

  it("runs reports by dimension with totals", async () => {
    const { runReport } = await import("@/lib/queries/reports");
    const byType = await runReport("type", { years: [2026] });
    expect(byType.rows.reduce((n, r) => n + r.received, 0)).toBe(byType.total.received);
    expect(byType.total.received).toBeGreaterThanOrEqual(250);
    const byChannel = await runReport("channel", {});
    expect(byChannel.rows.length).toBeGreaterThan(0);
    const byMonth = await runReport("month", { years: [2025] });
    expect(byMonth.rows.length).toBeLessThanOrEqual(13);
  });

  it("global search finds opportunities, companies and contacts", async () => {
    const { globalSearch } = await import("@/lib/queries/search");
    const results = await globalSearch("Alvarez");
    expect(results.some((r) => r.type === "company")).toBe(true);
    const opp = await globalSearch("Data Traffic");
    expect(opp.some((r) => r.type === "opportunity")).toBe(true);
  });
});
