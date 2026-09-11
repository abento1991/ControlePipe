import { normalizeKey } from "./text";

export type StatusKey =
  | "NEW"
  | "TRIAGE"
  | "ANALYSIS"
  | "DEEP_ANALYSIS"
  | "WAITING_INFO"
  | "PROPOSAL_SENT"
  | "COMMITTEE"
  | "DUE_DILIGENCE"
  | "STRUCTURING"
  | "ON_HOLD"
  | "CONCLUDED"
  | "DECLINED"
  | "INACTIVE"
  | "LEGACY_UNCLASSIFIED";

export type StatusGroupKey = "ACTIVE" | "ON_HOLD" | "CONCLUDED" | "CLOSED" | "LEGACY";
export type OutcomeKey = "OPEN" | "WON" | "LOST" | "ON_HOLD" | "INACTIVE" | "UNKNOWN";

export interface StatusDefinition {
  key: StatusKey;
  name: string;
  group: StatusGroupKey;
  outcome: OutcomeKey;
  sortOrder: number;
  color: string;
  isLegacy?: boolean;
}

/** Canonical, structured statuses. Operational stage (name/group) is separated from the final result (outcome). */
export const STATUS_DEFINITIONS: StatusDefinition[] = [
  { key: "NEW", name: "Novo", group: "ACTIVE", outcome: "OPEN", sortOrder: 10, color: "#7c8aa0" },
  { key: "TRIAGE", name: "Triagem", group: "ACTIVE", outcome: "OPEN", sortOrder: 20, color: "#8fa3b8" },
  { key: "ANALYSIS", name: "Em análise", group: "ACTIVE", outcome: "OPEN", sortOrder: 30, color: "#a3b86a" },
  { key: "DEEP_ANALYSIS", name: "Análise aprofundada", group: "ACTIVE", outcome: "OPEN", sortOrder: 40, color: "#8ea852" },
  { key: "WAITING_INFO", name: "Aguardando informações", group: "ACTIVE", outcome: "OPEN", sortOrder: 50, color: "#d1b25a" },
  { key: "PROPOSAL_SENT", name: "Proposta enviada", group: "ACTIVE", outcome: "OPEN", sortOrder: 60, color: "#6f9f3d" },
  { key: "COMMITTEE", name: "Comitê", group: "ACTIVE", outcome: "OPEN", sortOrder: 70, color: "#5c8f2f" },
  { key: "DUE_DILIGENCE", name: "Due Diligence", group: "ACTIVE", outcome: "OPEN", sortOrder: 80, color: "#4f7d2a" },
  { key: "STRUCTURING", name: "Estruturação", group: "ACTIVE", outcome: "OPEN", sortOrder: 90, color: "#3f6a22" },
  { key: "ON_HOLD", name: "On Hold", group: "ON_HOLD", outcome: "ON_HOLD", sortOrder: 100, color: "#c99a3b" },
  { key: "CONCLUDED", name: "Concluído / Investido", group: "CONCLUDED", outcome: "WON", sortOrder: 110, color: "#2f6b3a" },
  { key: "DECLINED", name: "Declinada", group: "CLOSED", outcome: "LOST", sortOrder: 120, color: "#9a4b4b" },
  { key: "INACTIVE", name: "Inativa", group: "CLOSED", outcome: "INACTIVE", sortOrder: 130, color: "#7a7a7a" },
  {
    key: "LEGACY_UNCLASSIFIED",
    name: "Legado / não classificado",
    group: "LEGACY",
    outcome: "UNKNOWN",
    sortOrder: 900,
    color: "#b0a48f",
    isLegacy: true,
  },
];

export interface StatusNormalization {
  key: StatusKey;
  confidence: number;
  note?: string;
}

/**
 * Maps the historical "Decisão" cell to a structured status.
 * Only unambiguous values are mapped; anything else is preserved as LEGACY_UNCLASSIFIED.
 */
export function normalizeDecision(raw: string | null | undefined): StatusNormalization {
  const key = normalizeKey(raw);
  if (!key) return { key: "LEGACY_UNCLASSIFIED", confidence: 0, note: "Decisão vazia na planilha" };
  if (key === "nao" || key === "declinada" || key === "declinado" || key === "negado") return { key: "DECLINED", confidence: 1 };
  if (key === "on hold" || key === "onhold" || key === "hold") return { key: "ON_HOLD", confidence: 1 };
  if (key === "em analise" || key === "analise" || key === "ativo" || key === "ativa") return { key: "ANALYSIS", confidence: 1 };
  if (key === "concluido" || key === "concluida" || key === "investido" || key === "investida") return { key: "CONCLUDED", confidence: 1 };
  if (key === "inativo" || key === "inativa") return { key: "INACTIVE", confidence: 1 };
  if (key === "-") return { key: "LEGACY_UNCLASSIFIED", confidence: 0, note: `Decisão "${raw}" não reconhecida` };
  return { key: "LEGACY_UNCLASSIFIED", confidence: 0, note: `Decisão "${raw}" não reconhecida` };
}

export function statusByKey(key: StatusKey): StatusDefinition {
  const def = STATUS_DEFINITIONS.find((s) => s.key === key);
  if (!def) throw new Error(`Unknown status ${key}`);
  return def;
}
