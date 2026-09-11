import { describe, expect, it } from "vitest";
import { parseFilters, buildWhere, filtersToSearchParams, countActiveFilters } from "@/lib/queries/filters";

describe("filters", () => {
  it("parses URL params into typed filters", () => {
    const f = parseFilters({ q: "petrobras", years: "2025,2026", assigneeIds: "a,b", overdue: "1", stale: "30" });
    expect(f.q).toBe("petrobras");
    expect(f.years).toEqual([2025, 2026]);
    expect(f.assigneeIds).toEqual(["a", "b"]);
    expect(f.overdue).toBe(true);
    expect(f.stale).toBe(30);
    expect(countActiveFilters(f)).toBe(5);
  });
  it("round-trips through search params", () => {
    const f = parseFilters({ years: "2024", typeIds: "x", needsReview: "1" });
    const sp = filtersToSearchParams(f);
    expect(parseFilters(Object.fromEntries(sp.entries()))).toEqual(f);
  });
  it("builds a where clause with all conditions", () => {
    const where = buildWhere({ q: "12", years: [2025], groups: ["ACTIVE"], assigneeIds: ["u1"], aging: [">90"], noNextAction: true }, new Date("2026-09-11T00:00:00Z"));
    const and = (where.AND as Record<string, unknown>[]) ?? [];
    expect(and[0]).toEqual({ isDeleted: false });
    expect(JSON.stringify(where)).toContain("legacyId");
    expect(JSON.stringify(where)).toContain("2025");
    expect(JSON.stringify(where)).toContain("ACTIVE");
    expect(JSON.stringify(where)).toContain("u1");
    expect(JSON.stringify(where)).toContain("nextAction");
  });
});
