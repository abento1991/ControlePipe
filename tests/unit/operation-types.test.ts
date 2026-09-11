import { describe, expect, it } from "vitest";
import { classifyOperationType, inferPrecatorioSphereFromName, OPERATION_TYPE_DEFINITIONS } from "@/lib/normalization/operation-types";

describe("classifyOperationType", () => {
  it("normalizes accent/plural/case variants of precatório", () => {
    for (const raw of ["Precatório Estadual", "Precatorio Estadual", "Precatórios Estaduais", "Precatorios Estadual", "Precatorio estadual RJ", "Precatório Estadual de Goiás"]) {
      expect(classifyOperationType(raw).slug, raw).toBe("precatorio-estadual");
    }
    for (const raw of ["Precatório Federal", "Precatorio federal", "Precatórios Federais", "Precatório Federal TRF1"]) {
      expect(classifyOperationType(raw).slug, raw).toBe("precatorio-federal");
    }
    for (const raw of ["Precatório Municipal", "Precatorio Municipal", "Precatórios Municipais", "Precatório de Camaçari"]) {
      expect(classifyOperationType(raw).slug, raw).toBe("precatorio-municipal");
    }
  });
  it("keeps generic precatório separate instead of guessing a sphere", () => {
    expect(classifyOperationType("Precatórios").slug).toBe("precatorio-nao-identificado");
    expect(classifyOperationType("Precatório").slug).toBe("precatorio-nao-identificado");
  });
  it("handles pré-precatório spellings", () => {
    expect(classifyOperationType("Pré Precatório Federal").slug).toBe("pre-precatorio-federal");
    expect(classifyOperationType("Pre precatorio Federal").slug).toBe("pre-precatorio-federal");
    expect(classifyOperationType("Pré-precatório").slug).toBe("pre-precatorio");
    expect(classifyOperationType("Pre precatorio Municipal - Feira de Santana").slug).toBe("pre-precatorio-municipal");
  });
  it("maps credit, DIP, NPL, legal claims and litigation finance", () => {
    expect(classifyOperationType("Crédito Estruturado").slug).toBe("credito-estruturado");
    expect(classifyOperationType("Crédito").slug).toBe("credito-estruturado");
    expect(classifyOperationType("Credito").slug).toBe("credito-estruturado");
    expect(classifyOperationType("DIP").slug).toBe("dip-exit-financing");
    expect(classifyOperationType("DIP para RJ").slug).toBe("dip-exit-financing");
    expect(classifyOperationType("Crédito para RJ").slug).toBe("dip-exit-financing");
    expect(classifyOperationType("NPL").slug).toBe("npl");
    expect(classifyOperationType("Compra de NPL").slug).toBe("npl");
    expect(classifyOperationType("Legal Claim").slug).toBe("legal-claim");
    expect(classifyOperationType("Legal Claims").slug).toBe("legal-claim");
    expect(classifyOperationType("Ação Judicial").slug).toBe("legal-claim");
    expect(classifyOperationType("Litigation Finance").slug).toBe("litigation-finance");
    expect(classifyOperationType("FIDC").slug).toBe("fidc");
    expect(classifyOperationType("Antecipação de Recebíveis").slug).toBe("antecipacao-recebiveis");
    expect(classifyOperationType("Falência").slug).toBe("falencia-distressed");
    expect(classifyOperationType("Direito Creditórios").slug).toBe("direitos-creditorios");
  });
  it("flags unknown or non-type values for review instead of dropping them", () => {
    const r = classifyOperationType("Rafael Spinelli");
    expect(r.slug).toBe("outros");
    expect(r.needsReview).toBe(true);
    expect(classifyOperationType(null).needsReview).toBe(true);
    expect(classifyOperationType("Apresentação").slug).toBe("nao-e-oportunidade");
  });
  it("infers precatório sphere from the opportunity name only when evidence exists", () => {
    expect(inferPrecatorioSphereFromName("Precatórios do Estado do RN")?.slug).toBe("precatorio-estadual");
    expect(inferPrecatorioSphereFromName("Precatórios da Camargo Correa")).toBeNull();
    expect(inferPrecatorioSphereFromName("FUNDEF x União")?.slug).toBe("precatorio-federal");
  });
  it("has unique slugs", () => {
    const slugs = OPERATION_TYPE_DEFINITIONS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
