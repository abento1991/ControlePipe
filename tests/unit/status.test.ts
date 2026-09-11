import { describe, expect, it } from "vitest";
import { normalizeDecision, STATUS_DEFINITIONS } from "@/lib/normalization/status";

describe("normalizeDecision", () => {
  it("maps case variants of Não/On Hold/Em análise/Concluído", () => {
    expect(normalizeDecision("Não").key).toBe("DECLINED");
    expect(normalizeDecision("não").key).toBe("DECLINED");
    expect(normalizeDecision("NÃO ").key).toBe("DECLINED");
    expect(normalizeDecision("On Hold").key).toBe("ON_HOLD");
    expect(normalizeDecision("On hold").key).toBe("ON_HOLD");
    expect(normalizeDecision("Em análise").key).toBe("ANALYSIS");
    expect(normalizeDecision("Concluído").key).toBe("CONCLUDED");
  });
  it("never invents a stage for unknown values", () => {
    expect(normalizeDecision(null).key).toBe("LEGACY_UNCLASSIFIED");
    expect(normalizeDecision("").key).toBe("LEGACY_UNCLASSIFIED");
    expect(normalizeDecision("-").key).toBe("LEGACY_UNCLASSIFIED");
    expect(normalizeDecision("talvez").key).toBe("LEGACY_UNCLASSIFIED");
    expect(normalizeDecision("talvez").confidence).toBe(0);
  });
  it("separates operational status from outcome", () => {
    const declined = STATUS_DEFINITIONS.find((s) => s.key === "DECLINED")!;
    const analysis = STATUS_DEFINITIONS.find((s) => s.key === "ANALYSIS")!;
    expect(declined.outcome).toBe("LOST");
    expect(declined.group).toBe("CLOSED");
    expect(analysis.outcome).toBe("OPEN");
    expect(analysis.group).toBe("ACTIVE");
    expect(STATUS_DEFINITIONS.find((s) => s.key === "LEGACY_UNCLASSIFIED")!.isLegacy).toBe(true);
  });
});
