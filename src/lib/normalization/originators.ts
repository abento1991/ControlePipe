import { normalizeKey, titleCase } from "./text";

export type CompanyCategoryKey =
  | "BANCO"
  | "ASSET"
  | "CONSULTORIA"
  | "BOUTIQUE"
  | "BROKER"
  | "ESCRITORIO_ADVOCACIA"
  | "EMPRESARIO_EXECUTIVO"
  | "ADVISOR"
  | "ORIGINACAO_PROPRIA"
  | "FUNDO"
  | "OUTROS";

export const COMPANY_CATEGORY_LABELS: Record<CompanyCategoryKey, string> = {
  BANCO: "Banco",
  ASSET: "Asset",
  CONSULTORIA: "Consultoria",
  BOUTIQUE: "Boutique",
  BROKER: "Broker",
  ESCRITORIO_ADVOCACIA: "Escritório de Advocacia",
  EMPRESARIO_EXECUTIVO: "Empresário / Executivo",
  ADVISOR: "Advisor",
  ORIGINACAO_PROPRIA: "Originação Própria",
  FUNDO: "Fundo",
  OUTROS: "Outros",
};

/**
 * Maps the historical "Tipo de Contato" / "Tipo de Originador" cells to a structured category.
 * Follows the de/para that already existed in the workbook ("Analise Originação 2025", cols Z→AA),
 * except that Advisor and Boutique are kept as their own categories (requested by the team).
 */
export function mapOriginatorCategory(raw: string | null | undefined): CompanyCategoryKey | null {
  const key = normalizeKey(raw);
  if (!key || key === "#n/a" || key === "0" || key === "-") return null;
  if (key === "banco" || key === "bndes") return "BANCO";
  if (key === "asset" || key === "gestora" || key === "fundo") return "ASSET";
  if (key === "fundo de investimento") return "FUNDO";
  if (key === "consultoria" || key === "jgp fa" || key === "a&m") return "CONSULTORIA";
  if (key === "boutique") return "BOUTIQUE";
  if (key === "broker") return "BROKER";
  if (key === "advogado" || key === "escritorio adv." || key === "escritorio adv" || key === "escritorio de advocacia" || key === "advogados") return "ESCRITORIO_ADVOCACIA";
  if (/empres|executiv|acionista|companhia|cliente/.test(key)) return "EMPRESARIO_EXECUTIVO";
  if (key === "advisor") return "ADVISOR";
  if (/originacao propria|cross sell/.test(key)) return "ORIGINACAO_PROPRIA";
  if (key === "outros" || key === "outro") return "OUTROS";
  return null;
}

/** Categories in which the originator listed by name is usually a person (broker, executive, lawyer, advisor). */
const PERSON_CATEGORIES: CompanyCategoryKey[] = ["BROKER", "EMPRESARIO_EXECUTIVO", "ESCRITORIO_ADVOCACIA", "ADVISOR"];
/** Categories that always describe institutions. */
const INSTITUTION_CATEGORIES: CompanyCategoryKey[] = ["BANCO", "ASSET", "CONSULTORIA", "BOUTIQUE", "FUNDO"];

const COMPANY_KEYWORDS =
  /(capital|partners|partner|advogados|advogado|investimentos|investimento|investments|investment|asset|assets|bank|banco|bba|consultoria|consulting|ltda|s\.a\.|s\/a|corporate|\bfa\b|\bhub\b|\badv\b|associados|finance|financeira|financial|gestora|gestao|securities|dtvm|trust|holding|group|grupo|\bib\b|banking|solucoes|soluções|solutions|advisory|advisors|research|equity|credit|credito|imobiliaria|realty|participacoes|participações|energia|agro\b|\blaw\b|legal|escritorio|sociedade|\bcia\b|\bcompany\b|\bco\.|\bltd\b|\binc\b|\bsa\b|marsal|moelis|santander|itau|bradesco|btg|\bxp\b|\bjgp\b|bndes|caixa|\bfidc\b|fundo|fund\b|\bacademy\b|\bvinci\b|\blokey\b|\bbrasil\b|\bcross sell\b|\bwhatsapp\b)/i

const PLACEHOLDERS: Record<string, { category: CompanyCategoryKey | null; label: string; company?: string }> = {
  broker: { category: "BROKER", label: "Broker (não identificado)" },
  advogado: { category: "ESCRITORIO_ADVOCACIA", label: "Advogado (não identificado)" },
  advisor: { category: "ADVISOR", label: "Advisor (não identificado)" },
  empresario: { category: "EMPRESARIO_EXECUTIVO", label: "Empresário (não identificado)" },
  "empresario / executivo": { category: "EMPRESARIO_EXECUTIVO", label: "Empresário / Executivo (não identificado)" },
  "empresario/executivo": { category: "EMPRESARIO_EXECUTIVO", label: "Empresário / Executivo (não identificado)" },
  consultoria: { category: "CONSULTORIA", label: "Consultoria (não identificada)" },
  "originacao propria": { category: "ORIGINACAO_PROPRIA", label: "Originação Própria", company: "Leto Capital (Originação Própria)" },
  "cross sell": { category: "ORIGINACAO_PROPRIA", label: "Cross sell", company: "Cross Sell (JGP / Leto)" },
  whatsapp: { category: null, label: "Contato via WhatsApp (originador não identificado)" },
  "-": { category: null, label: "Sem originador" },
  "n/a": { category: null, label: "Sem originador" },
  "#n/a": { category: null, label: "Sem originador" },
};

/** Canonical company names for common abbreviations found in the workbook. */
export const COMPANY_ALIASES: Record<string, string> = {
  "a&m": "Alvarez & Marsal",
  "alvarez& marsal": "Alvarez & Marsal",
  "alvarez marsal": "Alvarez & Marsal",
  "alvarez e marsal": "Alvarez & Marsal",
  "alvarez & marsal": "Alvarez & Marsal",
  jgp: "JGP FA",
  "jgp fa": "JGP FA",
  "jgp - fa": "JGP FA",
  "itau bba": "Itaú BBA",
  "itaú bba": "Itaú BBA",
  itau: "Itaú BBA",
  galdino: "Galdino Advogados",
  "galdino advogados": "Galdino Advogados",
  "souto correa": "Souto Correa",
  "souto correa advogados": "Souto Correa",
  ferro: "Ferro Advogados",
  "ferro advogados": "Ferro Advogados",
  "cm capital": "CM Capital",
  "cm capital (broker)": "CM Capital",
  "banco do brasil": "Banco do Brasil",
  bb: "Banco do Brasil",
  "stark investment banking": "Stark Investment Banking",
  "stark investimentos": "Stark Investment Banking",
  "stark investimentos (consultoria)": "Stark Investment Banking",
  stark: "Stark Investment Banking",
  "(x2w) consultoria": "X2W",
  x2w: "X2W",
  "special sits hub": "Special Sits Hub",
  "connectas capital": "Connectas Capital",
  connectas: "Connectas Capital",
  "hayden capital": "Hayden Capital",
  hayden: "Hayden Capital",
  "rmr corporate": "RMR Corporate",
  "sigma trust": "Sigma Trust",
  "dbv capital": "DBV Capital",
  "beam capital": "Beam Capital",
  "almeida mota": "Almeida Mota",
  "castro barros": "Castro Barros Advogados",
  "castro barros advogados": "Castro Barros Advogados",
  "cross sell": "Cross Sell (JGP / Leto)",
  "originacao propria": "Leto Capital (Originação Própria)",
};

export function canonicalCompanyName(name: string): string {
  const key = normalizeKey(name);
  return COMPANY_ALIASES[key] ?? name.trim().replace(/\s+/g, " ");
}

const PARTICLES = new Set(["de", "da", "do", "dos", "das", "e", "y", "van", "von", "del", "di"]);

/** Heuristic: 1-5 tokens, all name-like, without company keywords or digits. */
export function looksLikePerson(name: string): boolean {
  const cleaned = name.trim();
  if (!cleaned) return false;
  if (/[0-9&@]/.test(cleaned)) return false;
  if (COMPANY_KEYWORDS.test(cleaned)) return false;
  const tokens = cleaned.split(/\s+/);
  if (tokens.length > 5) return false;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (PARTICLES.has(lower)) continue;
    if (!/^[A-Za-zÀ-ÿ'.-]+$/.test(token)) return false;
    if (token.length > 1 && token === token.toUpperCase() && token.length <= 4) return false; // acronyms like RFA, AGI
  }
  return true;
}

export interface KnownOriginator {
  name: string;
  typeRaw: string | null;
  category: CompanyCategoryKey | null;
}

export interface OriginatorParseContext {
  /** Lookup built from the "Originadores" sheet: normalizedKey → known originator. */
  known?: Map<string, KnownOriginator>;
  /** Category hint from the row's "Tipo de Contato" cell. */
  typeHint?: CompanyCategoryKey | null;
}

export interface OriginatorParse {
  kind: "person" | "company" | "person_and_company" | "placeholder" | "empty" | "ambiguous";
  personName?: string;
  companyName?: string;
  /** For placeholders such as "Broker" — the category to keep on the opportunity. */
  category?: CompanyCategoryKey | null;
  confidence: number;
  needsReview: boolean;
  notes: string[];
  /** Job title captured from the cell, e.g. "Marcus (CFO)". */
  title?: string;
}

function splitPersonName(full: string): { firstName: string; lastName: string | null } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export { splitPersonName };

const TITLE_WORDS = /^(cfo|ceo|coo|cto|cro|diretor|diretora|socio|sócio|socia|sócia|assessor|assessora|advogado|advogada|presidente|head|gerente|analista|consultor|consultora|founder|fundador)$/i;

function classifyName(name: string, ctx: OriginatorParseContext): { kind: "person" | "company"; confidence: number; note?: string; category?: CompanyCategoryKey | null } {
  const key = normalizeKey(name);
  const known = ctx.known?.get(key);
  const tokens = name.trim().split(/\s+/).length;
  const personLike = looksLikePerson(name);
  if (known) {
    if (known.category && personLike && tokens >= 2) {
      return { kind: "person", confidence: INSTITUTION_CATEGORIES.includes(known.category) ? 0.7 : 0.9, note: `Cadastrado na aba Originadores como ${known.typeRaw}`, category: known.category };
    }
    if (known.category && personLike && PERSON_CATEGORIES.includes(known.category)) {
      return { kind: "person", confidence: 0.85, note: `Cadastrado na aba Originadores como ${known.typeRaw}`, category: known.category };
    }
    if (known.category) {
      return { kind: "company", confidence: 0.85, note: `Cadastrado na aba Originadores como ${known.typeRaw}`, category: known.category };
    }
  }
  if (COMPANY_ALIASES[key]) return { kind: "company", confidence: 0.95 };
  if (COMPANY_KEYWORDS.test(name)) return { kind: "company", confidence: 0.85 };
  if (personLike) {
    if (tokens === 1) {
      if (ctx.typeHint && INSTITUTION_CATEGORIES.includes(ctx.typeHint)) return { kind: "company", confidence: 0.6, note: `Palavra única com Tipo de Contato ${ctx.typeHint}` };
      return { kind: "person", confidence: 0.6, note: "Apenas primeiro nome" };
    }
    if (ctx.typeHint && INSTITUTION_CATEGORIES.includes(ctx.typeHint)) {
      return { kind: "person", confidence: 0.65, note: `Nome de pessoa; Tipo de Contato indica ${ctx.typeHint} (empresa não informada)`, category: ctx.typeHint };
    }
    return { kind: "person", confidence: 0.75 };
  }
  return { kind: "company", confidence: 0.5, note: "Não foi possível determinar se é pessoa ou empresa" };
}

/**
 * Parses the free-text "Contato" cell into person and/or company.
 * Unsafe cases are returned with low confidence and needsReview=true; the raw text is always preserved by the caller.
 */
export function parseOriginatorCell(raw: string | null | undefined, ctx: OriginatorParseContext = {}): OriginatorParse {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { kind: "empty", confidence: 1, needsReview: false, notes: ["Contato vazio na planilha"] };
  const key = normalizeKey(text);

  const placeholder = PLACEHOLDERS[key];
  if (placeholder) {
    return {
      kind: "placeholder",
      companyName: placeholder.company,
      category: placeholder.category,
      confidence: 0.9,
      needsReview: placeholder.category === null && key !== "-",
      notes: [placeholder.label],
    };
  }

  // "Person (Company)" or "Company (Person)"
  const partCtx: OriginatorParseContext = { known: ctx.known };
  const paren = text.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (paren) {
    const a = paren[1].trim();
    const b = paren[2].trim();
    const catB = mapOriginatorCategory(b);
    if (catB && !ctx.known?.get(normalizeKey(b))) {
      const ca0 = classifyName(a, partCtx);
      if (ca0.kind === "person") return { kind: "person", personName: a, category: catB, confidence: 0.85, needsReview: false, notes: [`Categoria "${b}" indicada entre parênteses`] };
      return { kind: "company", companyName: canonicalCompanyName(a), category: catB, confidence: 0.85, needsReview: false, notes: [`Categoria "${b}" indicada entre parênteses`] };
    }
    if (TITLE_WORDS.test(b)) {
      return { kind: "person", personName: a, confidence: 0.8, needsReview: false, notes: [`Cargo "${b}" indicado entre parênteses`], title: b };
    }
    const ca = classifyName(a, partCtx);
    const cb = classifyName(b, partCtx);
    if (ca.kind === "person" && cb.kind === "company") {
      return { kind: "person_and_company", personName: a, companyName: canonicalCompanyName(b), confidence: 0.9, needsReview: false, notes: ["Padrão 'Pessoa (Empresa)'"] };
    }
    if (ca.kind === "company" && cb.kind === "person") {
      return { kind: "person_and_company", personName: b, companyName: canonicalCompanyName(a), confidence: 0.85, needsReview: false, notes: ["Padrão 'Empresa (Pessoa)'"] };
    }
    if (ca.kind === "company" && cb.kind === "company") {
      const catB = mapOriginatorCategory(b);
      if (catB) {
        return { kind: "company", companyName: canonicalCompanyName(a), category: catB, confidence: 0.85, needsReview: false, notes: [`Categoria "${b}" indicada entre parênteses`] };
      }
      return { kind: "ambiguous", companyName: canonicalCompanyName(a), confidence: 0.5, needsReview: true, notes: [`Dois nomes de empresa: "${a}" e "${b}"`] };
    }
    return { kind: "ambiguous", personName: a, confidence: 0.4, needsReview: true, notes: [`Não foi possível separar "${a}" e "${b}" com segurança`] };
  }

  // "Person - Company"
  const dash = text.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (dash) {
    const a = dash[1].trim();
    const b = dash[2].trim();
    const ca = classifyName(a, partCtx);
    const cb = classifyName(b, partCtx);
    if (ca.kind === "person" && cb.kind === "company") {
      return { kind: "person_and_company", personName: a, companyName: canonicalCompanyName(b), confidence: 0.85, needsReview: false, notes: ["Padrão 'Pessoa - Empresa'"] };
    }
    if (ca.kind === "company" && cb.kind === "person") {
      return { kind: "person_and_company", personName: b, companyName: canonicalCompanyName(a), confidence: 0.8, needsReview: false, notes: ["Padrão 'Empresa - Pessoa'"] };
    }
    return { kind: "ambiguous", companyName: canonicalCompanyName(a), confidence: 0.45, needsReview: true, notes: [`Separador '-' com partes ambíguas: "${a}" / "${b}"`] };
  }

  // "A / B" — may be person/company, company/person or two companies
  const slash = text.split(/\s*\/\s*/);
  if (slash.length === 2) {
    const [a, b] = slash.map((s) => s.trim());
    let ca = classifyName(a, partCtx);
    let cb = classifyName(b, partCtx);
    // "Caique Melo / Aventos": a full name next to a single word — the single word is most likely the company.
    if (ca.kind === "person" && cb.kind === "person") {
      const ta = a.split(/\s+/).length;
      const tb = b.split(/\s+/).length;
      if (ta >= 2 && tb === 1) cb = { kind: "company", confidence: 0.6, note: "Palavra única tratada como empresa" };
      else if (tb >= 2 && ta === 1) ca = { kind: "company", confidence: 0.6, note: "Palavra única tratada como empresa" };
    }
    if (ca.kind === "person" && cb.kind === "company") {
      return { kind: "person_and_company", personName: a, companyName: canonicalCompanyName(b), confidence: 0.7, needsReview: true, notes: ["Padrão 'Pessoa / Empresa' — confirmar"] };
    }
    if (ca.kind === "company" && cb.kind === "person") {
      return { kind: "person_and_company", personName: b, companyName: canonicalCompanyName(a), confidence: 0.7, needsReview: true, notes: ["Padrão 'Empresa / Pessoa' — confirmar"] };
    }
    if (ca.kind === "company" && cb.kind === "company") {
      return { kind: "ambiguous", companyName: canonicalCompanyName(a), confidence: 0.5, needsReview: true, notes: [`Dois originadores: "${a}" e "${b}" — apenas o primeiro foi vinculado`] };
    }
    return { kind: "ambiguous", confidence: 0.3, needsReview: true, notes: [`Texto "${text}" não pôde ser separado`] };
  }
  if (slash.length > 2) {
    return { kind: "ambiguous", confidence: 0.2, needsReview: true, notes: ["Múltiplos separadores '/'"] };
  }

  // "Person e Person" / newline-separated multiple people
  if (/\n/.test(raw ?? "") || /\s+e\s+/.test(text) && looksLikePerson(text.replace(/\s+e\s+/, " "))) {
    return { kind: "ambiguous", personName: text, confidence: 0.4, needsReview: true, notes: ["Mais de uma pessoa na mesma célula"] };
  }

  // Single token
  const single = classifyName(text, ctx);
  if (single.kind === "person") {
    return {
      kind: "person",
      personName: titleCasePerson(text),
      category: single.category ?? ctx.typeHint ?? undefined,
      confidence: single.confidence,
      needsReview: single.confidence < 0.7,
      notes: single.note ? [single.note] : [],
    };
  }
  return {
    kind: "company",
    companyName: canonicalCompanyName(text),
    category: single.category ?? ctx.typeHint ?? undefined,
    confidence: single.confidence,
    needsReview: single.confidence < 0.7,
    notes: single.note ? [single.note] : [],
  };
}

function titleCasePerson(name: string): string {
  // Keep existing capitalisation when it already looks fine; fix all-lowercase surnames like "Pedro racioppi".
  const tokens = name.trim().split(/\s+/);
  return tokens
    .map((t) => {
      if (PARTICLES.has(t.toLowerCase())) return t.toLowerCase();
      if (t === t.toLowerCase()) return titleCase(t);
      return t;
    })
    .join(" ");
}
