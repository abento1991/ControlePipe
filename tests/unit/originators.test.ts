import { describe, expect, it } from "vitest";
import { parseOriginatorCell, mapOriginatorCategory, looksLikePerson, canonicalCompanyName } from "@/lib/normalization/originators";

describe("parseOriginatorCell", () => {
  it("splits 'Person (Company)'", () => {
    const r = parseOriginatorCell("João Pedro Santos (A&M)");
    expect(r.kind).toBe("person_and_company");
    expect(r.personName).toBe("João Pedro Santos");
    expect(r.companyName).toBe("Alvarez & Marsal");
    expect(r.needsReview).toBe(false);
  });
  it("splits 'Person - Company' and 'Company (Person)'", () => {
    expect(parseOriginatorCell("Renato Gorni - RMR Corporate")).toMatchObject({ personName: "Renato Gorni", companyName: "RMR Corporate" });
    expect(parseOriginatorCell("Thoreos (Gabriel Purri)")).toMatchObject({ personName: "Gabriel Purri", companyName: "Thoreos" });
    expect(parseOriginatorCell("Vicente Barros (Amavic)")).toMatchObject({ personName: "Vicente Barros", companyName: "Amavic" });
  });
  it("recognises companies and people on their own", () => {
    expect(parseOriginatorCell("Alvarez & Marsal")).toMatchObject({ kind: "company", companyName: "Alvarez & Marsal" });
    expect(parseOriginatorCell("Itau BBA")).toMatchObject({ kind: "company", companyName: "Itaú BBA" });
    expect(parseOriginatorCell("Mauricio Guimarães")).toMatchObject({ kind: "person", personName: "Mauricio Guimarães" });
    expect(parseOriginatorCell("Galdino Advogados")).toMatchObject({ kind: "company" });
  });
  it("flags ambiguous cells for manual review instead of guessing", () => {
    const two = parseOriginatorCell("Beam Capital / Almeida Mota");
    expect(two.needsReview).toBe(true);
    const multi = parseOriginatorCell("Paulo Viola (assessor)\nCelso Paes (CFO)");
    expect(multi.needsReview).toBe(true);
    expect(parseOriginatorCell("WhatsApp").kind).toBe("placeholder");
  });
  it("treats placeholders as categories, not entities", () => {
    const b = parseOriginatorCell("Broker");
    expect(b.kind).toBe("placeholder");
    expect(b.category).toBe("BROKER");
    expect(b.companyName).toBeUndefined();
    expect(parseOriginatorCell("Originação Própria").companyName).toContain("Originação Própria");
  });
  it("captures titles and categories in parentheses", () => {
    expect(parseOriginatorCell("Marcus (CFO)")).toMatchObject({ kind: "person", personName: "Marcus", title: "CFO" });
    expect(parseOriginatorCell("CM Capital (Broker)")).toMatchObject({ kind: "company", companyName: "CM Capital", category: "BROKER" });
  });
  it("uses the known originator list", () => {
    const known = new Map([["enio", { name: "Enio", typeRaw: "Broker", category: "BROKER" as const }]]);
    expect(parseOriginatorCell("Enio", { known })).toMatchObject({ kind: "person", personName: "Enio" });
  });
});

describe("mapOriginatorCategory", () => {
  it("follows the workbook de/para", () => {
    expect(mapOriginatorCategory("Advogado")).toBe("ESCRITORIO_ADVOCACIA");
    expect(mapOriginatorCategory("JGP FA")).toBe("CONSULTORIA");
    expect(mapOriginatorCategory("Gestora")).toBe("ASSET");
    expect(mapOriginatorCategory("BNDES")).toBe("BANCO");
    expect(mapOriginatorCategory("Empresário/Executivo")).toBe("EMPRESARIO_EXECUTIVO");
    expect(mapOriginatorCategory("Executivo/empresário")).toBe("EMPRESARIO_EXECUTIVO");
    expect(mapOriginatorCategory("#N/A")).toBeNull();
    expect(mapOriginatorCategory("0")).toBeNull();
  });
});

describe("helpers", () => {
  it("looksLikePerson", () => {
    expect(looksLikePerson("Lucas Cive")).toBe(true);
    expect(looksLikePerson("Hayden Capital")).toBe(false);
    expect(looksLikePerson("RFA")).toBe(false);
  });
  it("canonicalCompanyName resolves aliases", () => {
    expect(canonicalCompanyName("A&M")).toBe("Alvarez & Marsal");
    expect(canonicalCompanyName("Alvarez& Marsal")).toBe("Alvarez & Marsal");
    expect(canonicalCompanyName("Some New Co")).toBe("Some New Co");
  });
});
