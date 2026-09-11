export const CHANNEL_OPTIONS = [
  { value: "EMAIL", label: "E-mail" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "LIGACAO", label: "Ligação" },
  { value: "REUNIAO", label: "Reunião" },
  { value: "INDICACAO", label: "Indicação" },
  { value: "ORIGINACAO_PROPRIA", label: "Originação própria" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "BANCO", label: "Banco" },
  { value: "ASSET", label: "Asset" },
  { value: "CONSULTORIA", label: "Consultoria" },
  { value: "BOUTIQUE", label: "Boutique" },
  { value: "BROKER", label: "Broker" },
  { value: "ESCRITORIO_ADVOCACIA", label: "Escritório de Advocacia" },
  { value: "EMPRESARIO_EXECUTIVO", label: "Empresário / Executivo" },
  { value: "ADVISOR", label: "Advisor" },
  { value: "ORIGINACAO_PROPRIA", label: "Originação Própria" },
  { value: "FUNDO", label: "Fundo" },
  { value: "OUTROS", label: "Outros" },
] as const;

export const RELATIONSHIP_OPTIONS = [
  { value: "ESTRATEGICO", label: "Estratégico" },
  { value: "ATIVO", label: "Ativo" },
  { value: "ESPORADICO", label: "Esporádico" },
  { value: "FRIO", label: "Frio" },
  { value: "NOVO", label: "Novo" },
] as const;

export const ACTIVITY_TYPE_OPTIONS = [
  { value: "NOTE", label: "Nota" },
  { value: "EMAIL", label: "E-mail" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MEETING", label: "Reunião" },
  { value: "CALL", label: "Ligação" },
  { value: "INFO_RECEIVED", label: "Informação recebida" },
  { value: "PROPOSAL_SENT", label: "Proposta enviada" },
] as const;

export const ATTACHMENT_KIND_OPTIONS = [
  { value: "TEASER", label: "Teaser" },
  { value: "MODEL", label: "Modelo" },
  { value: "PRESENTATION", label: "Apresentação" },
  { value: "LEGAL", label: "Documento jurídico" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "NDA", label: "NDA" },
  { value: "OTHER", label: "Outro" },
] as const;

export const TYPE_CATEGORY_OPTIONS = [
  { value: "CREDITO_ESTRUTURADO", label: "Crédito Estruturado" },
  { value: "DIP_EXIT_FINANCING", label: "DIP / Exit Financing" },
  { value: "NPL", label: "NPL" },
  { value: "LEGAL_CLAIM", label: "Legal Claim" },
  { value: "LITIGATION_FINANCE", label: "Litigation Finance" },
  { value: "PRECATORIO_FEDERAL", label: "Precatório Federal" },
  { value: "PRECATORIO_ESTADUAL", label: "Precatório Estadual" },
  { value: "PRECATORIO_MUNICIPAL", label: "Precatório Municipal" },
  { value: "PRE_PRECATORIO", label: "Pré-Precatório" },
  { value: "DIREITOS_CREDITORIOS", label: "Direitos Creditórios" },
  { value: "FIDC", label: "FIDC" },
  { value: "ANTECIPACAO_RECEBIVEIS", label: "Antecipação de Recebíveis" },
  { value: "FALENCIA_DISTRESSED", label: "Falência / Distressed Assets" },
  { value: "OUTROS", label: "Outros" },
] as const;

export const ISSUE_LABELS: Record<string, string> = {
  MISSING_NAME: "Sem nome",
  MISSING_DATE: "Sem data de entrada",
  INVALID_YEAR: "Ano inválido na planilha",
  YEAR_MISMATCH: "Ano inconsistente",
  EXIT_BEFORE_ENTRY: "Saída antes da entrada",
  AMOUNT_NOT_NUMERIC: "Valor não numérico",
  STATUS_UNNORMALIZED: "Status não normalizado",
  TYPE_MISSING: "Tipo de operação vazio",
  TYPE_UNNORMALIZED: "Tipo de operação não normalizado",
  TYPE_SPHERE_INFERRED: "Esfera de precatório inferida",
  NOT_AN_OPPORTUNITY: "Não é oportunidade",
  ASSIGNEE_UNMAPPED: "Responsável legado não mapeado",
  ORIGINATOR_MISSING: "Originador vazio",
  ORIGINATOR_UNCLASSIFIED: "Originador não classificado",
  ORIGINATOR_CATEGORY_UNMAPPED: "Tipo de contato não mapeado",
  ORIGINATOR_CATEGORY_MISSING: "Originador sem categoria",
  COMPANY_UNIDENTIFIED: "Empresa não identificada",
  POSSIBLE_DUPLICATE: "Possível duplicidade",
};

export function labelOf<T extends readonly { value: string; label: string }[]>(options: T, value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
