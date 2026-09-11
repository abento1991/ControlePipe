import { describe, expect, it } from "vitest";
import { parseLegacyLog, detectMilestones } from "@/lib/normalization/legacy-timeline";
import { parseAmount, parseSheetDate, parseYear } from "@/lib/normalization/values";

describe("parseLegacyLog", () => {
  it("splits dated lines and infers the year from the entry date", () => {
    const entries = parseLegacyLog("02/02 - Realizamos o call\n08/02 - Enviaram dados\n23/02 - Pendente de devolutiva", new Date(Date.UTC(2024, 0, 15)));
    expect(entries).toHaveLength(3);
    expect(entries[0].occurredAt?.toISOString().slice(0, 10)).toBe("2024-02-02");
    expect(entries[0].text).toBe("Realizamos o call");
    expect(entries[0].dateInferred).toBe(true);
    expect(entries[2].occurredAt?.toISOString().slice(0, 10)).toBe("2024-02-23");
  });
  it("rolls into the next year when months go backwards", () => {
    const entries = parseLegacyLog("25/11 - Em análise\n10/01 - Vamos negar", new Date(Date.UTC(2024, 10, 20)));
    expect(entries[1].occurredAt?.toISOString().slice(0, 10)).toBe("2025-01-10");
  });
  it("keeps undated text as a single entry and merges continuation lines", () => {
    const entries = parseLegacyLog("Tese conhecida do IAA\ncom riscos jurisprudenciais", null);
    expect(entries).toHaveLength(1);
    expect(entries[0].occurredAt).toBeNull();
    expect(entries[0].text).toContain("riscos");
  });
  it("detects milestones", () => {
    expect(detectMilestones("20/08 - enviamos proposta indicativa").proposalSent).toBe(true);
    expect(detectMilestones("recebemos acesso ao data room").deepAnalysis).toBe(true);
    expect(detectMilestones("em análise").proposalSent).toBe(false);
  });
});

describe("value parsers", () => {
  it("parses amounts and preserves raw text", () => {
    expect(parseAmount(12.5)).toEqual({ amount: 12.5, raw: "12.5" });
    expect(parseAmount("TBD").amount).toBeNull();
    expect(parseAmount("TBD").raw).toBe("TBD");
    expect(parseAmount("5 a 10mm").amount).toBeNull();
  });
  it("parses dates and invalid years", () => {
    expect(parseSheetDate(new Date(2024, 0, 12)).date?.toISOString().slice(0, 10)).toBe("2024-01-12");
    expect(parseSheetDate("-").date).toBeNull();
    expect(parseSheetDate("-").raw).toBe("-");
    expect(parseYear("1900").year).toBeNull();
    expect(parseYear("#VALUE!").year).toBeNull();
    expect(parseYear(2025).year).toBe(2025);
  });
});
