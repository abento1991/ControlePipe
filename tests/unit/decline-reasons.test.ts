import { describe, expect, it } from "vitest";
import { inferDeclineReason, DECLINE_REASONS } from "@/lib/normalization/decline-reasons";

describe("inferDeclineReason", () => {
  it("classifies the recurring reasons of the legacy sheet", () => {
    expect(inferDeclineReason("Operação sem perfil do fundo")?.reason).toBe("SEM_FIT");
    expect(inferDeclineReason("Não olhamos crédito administrativo")?.reason).toBe("SEM_FIT");
    expect(inferDeclineReason("09/04 - Valor baixo para SS")?.reason).toBe("TICKET");
    expect(inferDeclineReason("17/06 - Expectativa mto alta de valor")?.reason).toBe("PRECO_RETORNO");
    expect(inferDeclineReason("Ainda sem evoluçao do turnaround, pouca garantia")?.reason).toBe("GARANTIA_RISCO");
    expect(inferDeclineReason("Ainda não tem transito em julgado")?.reason).toBe("CREDITO_FRACO");
    expect(inferDeclineReason("Expectativa de pagamento acima de 7 anos")?.reason).toBe("PRECO_RETORNO");
    expect(inferDeclineReason("Prazo acima do limite do fundo")?.reason).toBe("PRAZO");
    expect(inferDeclineReason("09/04 - precatorio pago")?.reason).toBe("ATIVO_RESOLVIDO");
    expect(inferDeclineReason("Seguiram com a Lumina")?.reason).toBe("ATIVO_RESOLVIDO");
    expect(inferDeclineReason("07/05 - sem retorno")?.reason).toBe("CONTRAPARTE_DESISTIU");
    expect(inferDeclineReason("Nao mandamos proposta")?.reason).toBe("NAO_PARTICIPAMOS");
  });
  it("tells who walked away", () => {
    expect(inferDeclineReason("Não aceitaram o preço proposto (65% do PU)")?.declinedBy).toBe("CONTRAPARTE");
    expect(inferDeclineReason("Seguiram com a Lumina")?.declinedBy).toBe("CONTRAPARTE");
    expect(inferDeclineReason("07/05 - sem retorno")?.declinedBy).toBe("CONTRAPARTE");
    expect(inferDeclineReason("Garantia insuficiente")?.declinedBy).toBe("LETO");
    expect(inferDeclineReason("Operação sem perfil do fundo")?.declinedBy).toBe("LETO");
  });
  it("returns null for empty or date-only texts", () => {
    expect(inferDeclineReason("")).toBeNull();
    expect(inferDeclineReason(null)).toBeNull();
    expect(inferDeclineReason("11/09 -")).toBeNull();
    expect(inferDeclineReason("Familia Ribas")).toBeNull();
  });
  it("has unique keys and labels", () => {
    expect(new Set(DECLINE_REASONS.map((r) => r.key)).size).toBe(DECLINE_REASONS.length);
    expect(new Set(DECLINE_REASONS.map((r) => r.label)).size).toBe(DECLINE_REASONS.length);
  });
});
