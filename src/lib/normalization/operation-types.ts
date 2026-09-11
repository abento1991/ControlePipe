import { normalizeKey } from "./text";

export type OperationCategoryKey =
  | "CREDITO_ESTRUTURADO"
  | "DIP_EXIT_FINANCING"
  | "NPL"
  | "LEGAL_CLAIM"
  | "LITIGATION_FINANCE"
  | "PRECATORIO_FEDERAL"
  | "PRECATORIO_ESTADUAL"
  | "PRECATORIO_MUNICIPAL"
  | "PRE_PRECATORIO"
  | "DIREITOS_CREDITORIOS"
  | "FIDC"
  | "ANTECIPACAO_RECEBIVEIS"
  | "FALENCIA_DISTRESSED"
  | "OUTROS";

export interface OperationTypeDefinition {
  slug: string;
  name: string;
  category: OperationCategoryKey;
  color: string;
  sortOrder: number;
  description?: string;
}

export const OPERATION_TYPE_DEFINITIONS: OperationTypeDefinition[] = [
  { slug: "credito-estruturado", name: "Crédito Estruturado", category: "CREDITO_ESTRUTURADO", color: "#587f28", sortOrder: 10 },
  { slug: "titulos-de-credito", name: "Títulos de Crédito (Debêntures / CRA / CRI)", category: "CREDITO_ESTRUTURADO", color: "#7b9a45", sortOrder: 15 },
  { slug: "dip-exit-financing", name: "DIP / Exit Financing", category: "DIP_EXIT_FINANCING", color: "#3b6b8f", sortOrder: 20 },
  { slug: "npl", name: "NPL", category: "NPL", color: "#8f5a3b", sortOrder: 30 },
  { slug: "legal-claim", name: "Legal Claim", category: "LEGAL_CLAIM", color: "#6b4f8f", sortOrder: 40 },
  { slug: "litigation-finance", name: "Litigation Finance", category: "LITIGATION_FINANCE", color: "#8f3b7a", sortOrder: 50 },
  { slug: "precatorio-federal", name: "Precatório Federal", category: "PRECATORIO_FEDERAL", color: "#2f6b5a", sortOrder: 60 },
  { slug: "precatorio-estadual", name: "Precatório Estadual", category: "PRECATORIO_ESTADUAL", color: "#3f8a6f", sortOrder: 61 },
  { slug: "precatorio-municipal", name: "Precatório Municipal", category: "PRECATORIO_MUNICIPAL", color: "#5aa88a", sortOrder: 62 },
  {
    slug: "precatorio-nao-identificado",
    name: "Precatório (esfera não identificada)",
    category: "OUTROS",
    color: "#8fbfa8",
    sortOrder: 63,
    description: "Precatório cuja esfera (federal/estadual/municipal) não consta na planilha.",
  },
  { slug: "pre-precatorio-federal", name: "Pré-Precatório Federal", category: "PRE_PRECATORIO", color: "#8a7a2f", sortOrder: 70 },
  { slug: "pre-precatorio-estadual", name: "Pré-Precatório Estadual", category: "PRE_PRECATORIO", color: "#a8933f", sortOrder: 71 },
  { slug: "pre-precatorio-municipal", name: "Pré-Precatório Municipal", category: "PRE_PRECATORIO", color: "#c2ab52", sortOrder: 72 },
  { slug: "pre-precatorio", name: "Pré-Precatório (esfera não identificada)", category: "PRE_PRECATORIO", color: "#d8c27a", sortOrder: 73 },
  { slug: "direitos-creditorios", name: "Direitos Creditórios", category: "DIREITOS_CREDITORIOS", color: "#4a6f8f", sortOrder: 80 },
  { slug: "fidc", name: "FIDC", category: "FIDC", color: "#2f5a8f", sortOrder: 90 },
  { slug: "antecipacao-recebiveis", name: "Antecipação de Recebíveis", category: "ANTECIPACAO_RECEBIVEIS", color: "#6f8fa8", sortOrder: 100 },
  { slug: "falencia-distressed", name: "Falência / Distressed Assets", category: "FALENCIA_DISTRESSED", color: "#8f3b3b", sortOrder: 110 },
  { slug: "outros", name: "Outros", category: "OUTROS", color: "#9a9a9a", sortOrder: 900 },
  {
    slug: "nao-e-oportunidade",
    name: "Não é oportunidade (tarefa interna / apresentação)",
    category: "OUTROS",
    color: "#c0c0c0",
    sortOrder: 910,
    description: "Linhas da planilha que registram tarefas internas (apresentações, cartas, site) e não uma oportunidade de investimento.",
  },
];

export interface TypeClassification {
  slug: string;
  confidence: number;
  needsReview: boolean;
  note?: string;
}

interface Rule {
  test: (key: string) => boolean;
  slug: string;
  confidence: number;
  note?: string;
}

const STATE_WORDS =
  /(estad|estado|\brj\b|\bsp\b|\bmt\b|\bpr\b|\bto\b|\bdf\b|\bgo\b|\bce\b|\bpa\b|\brn\b|\bse\b|\bba\b|\bmg\b|\brs\b|\bsc\b|\bes\b|\bam\b|\bma\b|\bpb\b|\bpe\b|\bpi\b|\bal\b|\bac\b|\bap\b|\brr\b|\bro\b|\bms\b|paran|goias|sergipe|tocantis|tocantins|ceara|rio de janeiro|sao paulo|mato grosso|parana|bahia|minas|pernambuco|amazonas|para\b|maranhao|piaui|alagoas|rio grande|santa catarina|espirito santo|distrito federal)/;
const CITY_WORDS = /(municip|prefeitura|camacari|fortaleza|feira de santana|contagem|rio claro|cno)/;
const FEDERAL_WORDS = /(federal|federais|uniao|inss|trf|brasilia|alimentar|iaa|tunep|fundef|incra|dnit)/;

const OVERRIDES: Record<string, TypeClassification> = {
  // Cells that contain a person's/company's name instead of an operation type.
  "rafael spinelli": { slug: "outros", confidence: 0.2, needsReview: true, note: "Célula contém nome de pessoa, não um tipo de operação" },
  "marcelo leonel": { slug: "outros", confidence: 0.2, needsReview: true, note: "Célula contém nome de pessoa, não um tipo de operação" },
  angatu: { slug: "outros", confidence: 0.2, needsReview: true, note: "Célula contém nome próprio, não um tipo de operação" },
  technion: { slug: "outros", confidence: 0.2, needsReview: true, note: "Célula contém nome próprio, não um tipo de operação" },
  "gazeta mercantil": { slug: "outros", confidence: 0.2, needsReview: true, note: "Célula contém nome próprio, não um tipo de operação" },
  "precatorio fa": { slug: "precatorio-nao-identificado", confidence: 0.4, needsReview: true, note: "Sigla FA não identificada" },
  "precatorio 3a investimentos": { slug: "precatorio-nao-identificado", confidence: 0.6, needsReview: true, note: "Tipo contém nome do originador" },
  "carteira precatorios a&m": { slug: "precatorio-nao-identificado", confidence: 0.6, needsReview: true, note: "Tipo contém nome do originador" },
  "venda de cia de antecipacao de preca": { slug: "outros", confidence: 0.5, needsReview: true, note: "Venda de empresa (não é aquisição de precatório)" },
  // Internal tasks that were tracked in the same sheet.
  "apresentacao de special sits": { slug: "nao-e-oportunidade", confidence: 0.9, needsReview: false },
  "apresentacao de npl para o banco do brasil": { slug: "nao-e-oportunidade", confidence: 0.9, needsReview: false },
  "sugestao de parceria": { slug: "nao-e-oportunidade", confidence: 0.8, needsReview: false },
  "formulario de referencia/leme forense": { slug: "nao-e-oportunidade", confidence: 0.9, needsReview: false },
  "site ri": { slug: "nao-e-oportunidade", confidence: 0.9, needsReview: false },
  carta: { slug: "nao-e-oportunidade", confidence: 0.9, needsReview: false },
  apresentacao: { slug: "nao-e-oportunidade", confidence: 0.9, needsReview: false },
  // Explicit mappings copied from the workbook's own hidden de/para (Sheet2) where a rule would be ambiguous.
  leilao: { slug: "direitos-creditorios", confidence: 0.6, needsReview: true, note: "Sheet2 da planilha mapeava 'Leilão' para Direitos Creditórios" },
  "imoveis em leilao": { slug: "outros", confidence: 0.6, needsReview: true, note: "Ativo imobiliário em leilão" },
  tunepe: { slug: "legal-claim", confidence: 0.6, needsReview: true, note: "TUNEP — tese judicial contra a União" },
  tunep: { slug: "legal-claim", confidence: 0.6, needsReview: true, note: "TUNEP — tese judicial contra a União" },
  "precatorio tunep": { slug: "precatorio-federal", confidence: 0.7, needsReview: true, note: "TUNEP é tese federal" },
  "acordo de negociacao das fazendas": { slug: "outros", confidence: 0.5, needsReview: true },
  "aquisicao de empresa": { slug: "outros", confidence: 0.7, needsReview: true, note: "M&A / equity" },
  equity: { slug: "outros", confidence: 0.7, needsReview: true, note: "Equity" },
  "venda de ativo": { slug: "outros", confidence: 0.6, needsReview: true },
  "ativos para monetizacao": { slug: "outros", confidence: 0.5, needsReview: true },
  "sucumbencia de precatorio": { slug: "legal-claim", confidence: 0.7, needsReview: true, note: "Honorários de sucumbência" },
  inventario: { slug: "legal-claim", confidence: 0.6, needsReview: true },
  "credito ust": { slug: "direitos-creditorios", confidence: 0.5, needsReview: true },
  "compra de creditos do cs": { slug: "direitos-creditorios", confidence: 0.6, needsReview: true },
  "carteira de real estate": { slug: "outros", confidence: 0.6, needsReview: true, note: "Carteira imobiliária" },
  "carteira de ativos": { slug: "outros", confidence: 0.5, needsReview: true },
  carteira: { slug: "outros", confidence: 0.4, needsReview: true, note: "Tipo de carteira não informado" },
  "financiamento imobiliario": { slug: "credito-estruturado", confidence: 0.7, needsReview: false },
  "divida para recompra de imovel": { slug: "credito-estruturado", confidence: 0.7, needsReview: false },
};

const RULES: Rule[] = [
  // Pré-precatório (must come before precatório rules)
  { test: (k) => /pre[ -]?precat/.test(k) && FEDERAL_WORDS.test(k), slug: "pre-precatorio-federal", confidence: 0.95 },
  { test: (k) => /pre[ -]?precat/.test(k) && CITY_WORDS.test(k), slug: "pre-precatorio-municipal", confidence: 0.95 },
  { test: (k) => /pre[ -]?precat/.test(k) && STATE_WORDS.test(k), slug: "pre-precatorio-estadual", confidence: 0.95 },
  { test: (k) => /pre[ -]?precat/.test(k), slug: "pre-precatorio", confidence: 0.9 },
  // Precatório by sphere
  { test: (k) => /precat/.test(k) && FEDERAL_WORDS.test(k), slug: "precatorio-federal", confidence: 0.95 },
  { test: (k) => /precat/.test(k) && CITY_WORDS.test(k), slug: "precatorio-municipal", confidence: 0.95 },
  { test: (k) => /precat/.test(k) && STATE_WORDS.test(k), slug: "precatorio-estadual", confidence: 0.9 },
  { test: (k) => /^precat[oó]rios?$/.test(k), slug: "precatorio-nao-identificado", confidence: 0.9 },
  { test: (k) => /precat/.test(k), slug: "precatorio-nao-identificado", confidence: 0.6, note: "Esfera do precatório não identificada" },
  // DIP / RJ
  { test: (k) => /\bdip\b/.test(k) || /\brj\b/.test(k) || /recupera/.test(k), slug: "dip-exit-financing", confidence: 0.95 },
  // NPL
  { test: (k) => /\bnpl\b/.test(k) || /leilao (itau|single)/.test(k), slug: "npl", confidence: 0.95 },
  // Litigation finance
  { test: (k) => /litigation/.test(k), slug: "litigation-finance", confidence: 0.95 },
  // Legal claims / lawsuits / fees
  { test: (k) => /legal claim|\bclaims?\b|acao judicial|acao contra|ativos judiciais|execucao|arbitragem|honorari|trabalhista/.test(k), slug: "legal-claim", confidence: 0.9 },
  // Tax credits → direitos creditórios
  { test: (k) => /icms|tributar|ativo fiscal|\btda\b/.test(k), slug: "direitos-creditorios", confidence: 0.8 },
  { test: (k) => /direit[oa]s? credit|compra de credit|compra de creditos/.test(k), slug: "direitos-creditorios", confidence: 0.9 },
  // FIDC
  { test: (k) => /fidc|fiagro/.test(k), slug: "fidc", confidence: 0.95 },
  // Receivables anticipation
  { test: (k) => /antecipa/.test(k), slug: "antecipacao-recebiveis", confidence: 0.9 },
  // Bankruptcy / distressed assets
  { test: (k) => /falenc|massa falida|\bupi\b/.test(k), slug: "falencia-distressed", confidence: 0.9 },
  // Debt securities
  { test: (k) => /debenture|\bcra\b|\bcri\b/.test(k), slug: "titulos-de-credito", confidence: 0.9 },
  // Credit portfolios → NPL (sale of receivables portfolios is analysed as NPL by the team)
  { test: (k) => /carteira de (credito|creditos|recebiveis)|venda de carteira|compra de carteira/.test(k), slug: "npl", confidence: 0.75, note: "Carteira de crédito classificada como NPL" },
  // Generic credit → Crédito Estruturado
  { test: (k) => /^cr[eé]dito$/.test(k) || /^credito$/.test(k), slug: "credito-estruturado", confidence: 0.9, note: "'Crédito' genérico classificado como Crédito Estruturado" },
  { test: (k) => /credito|capital de giro|capex|refinanciamento|alongamento|capital solution|divida|financiamento|emprestimo/.test(k), slug: "credito-estruturado", confidence: 0.8 },
];

/**
 * Classifies a raw "Tipo de Operação" cell. The raw value is never modified; the caller stores it in
 * `operationTypeRaw` and stores the resulting slug in `operationTypeId`.
 */
export function classifyOperationType(raw: string | null | undefined): TypeClassification {
  const key = normalizeKey(raw);
  if (!key) return { slug: "outros", confidence: 0, needsReview: true, note: "Tipo de operação vazio" };
  const exact = OPERATION_TYPE_DEFINITIONS.find((d) => normalizeKey(d.name) === key || d.slug === key);
  if (exact) return { slug: exact.slug, confidence: 1, needsReview: false };
  if (OVERRIDES[key]) return OVERRIDES[key];
  for (const rule of RULES) {
    if (rule.test(key)) {
      return { slug: rule.slug, confidence: rule.confidence, needsReview: rule.confidence < 0.7, note: rule.note };
    }
  }
  return { slug: "outros", confidence: 0.3, needsReview: true, note: `Tipo "${raw}" não reconhecido pelas regras` };
}

/**
 * When the type is a generic precatório, try to infer the sphere from the opportunity name.
 * Returns null when nothing can be inferred safely.
 */
export function inferPrecatorioSphereFromName(name: string | null | undefined): { slug: string; hint: string } | null {
  const key = normalizeKey(name);
  if (!key) return null;
  if (/(uniao|federal|inss|trf|fundef|incra|dnit|tunep|iaa)/.test(key)) return { slug: "precatorio-federal", hint: "federal" };
  if (/(municip|prefeitura|cidade|camacari|fortaleza|contagem|rio claro|feira de santana)/.test(key)) return { slug: "precatorio-municipal", hint: "municipal" };
  if (/(estado|estadual|governo do|\bparana\b|\bgoias\b|\bsergipe\b|\bceara\b|\bbahia\b|tocantins|mato grosso|rio grande|minas gerais|sao paulo|rio de janeiro|\bdf\b)/.test(key))
    return { slug: "precatorio-estadual", hint: "estadual" };
  return null;
}
