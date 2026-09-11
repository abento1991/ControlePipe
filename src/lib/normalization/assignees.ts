import { normalizeKey } from "./text";

export interface TeamMember {
  key: string;
  name: string;
  email: string;
  isArchived: boolean;
  aliases: string[];
  color: string;
}

/** Current team + archived legacy members found in the spreadsheet. */
export const TEAM_MEMBERS: TeamMember[] = [
  { key: "antonio", name: "Antônio Penido", email: "antonio.penido@letocapital.com.br", isArchived: false, aliases: ["antonio", "ap", "antônio", "penido"], color: "#5c7a2e" },
  { key: "vitoria", name: "Vitória Iglesias", email: "vitoria.iglesias@letocapital.com.br", isArchived: false, aliases: ["vitoria", "vitória", "iglesias", "vi"], color: "#3b6b8f" },
  { key: "christopher", name: "Christopher Soares", email: "christopher.soares@letocapital.com.br", isArchived: false, aliases: ["christopher", "chris", "soares"], color: "#8f5a3b" },
  { key: "luiza", name: "Luiza Oswald", email: "luiza.oswald@letocapital.com.br", isArchived: false, aliases: ["luiza", "oswald", "lu"], color: "#6b4f8f" },
  { key: "equipe", name: "Equipe Leto", email: "equipe@letocapital.com.br", isArchived: false, aliases: ["equipe", "equipe leto", "time"], color: "#0f1411" },
  { key: "hugo", name: "Hugo (Archived User)", email: "hugo@archived.leto.local", isArchived: true, aliases: ["hugo"], color: "#8a8a8a" },
  { key: "bernardo", name: "Bernardo (Archived User)", email: "bernardo@archived.leto.local", isArchived: true, aliases: ["bernardo"], color: "#8a8a8a" },
  { key: "mollica", name: "Mollica (Archived User)", email: "mollica@archived.leto.local", isArchived: true, aliases: ["mollica"], color: "#8a8a8a" },
  { key: "mauad", name: "Mauad (Archived User)", email: "mauad@archived.leto.local", isArchived: true, aliases: ["mauad"], color: "#8a8a8a" },
];

export interface AssigneeParse {
  /** Team member keys that were safely recognised. */
  members: string[];
  /** Tokens that could not be mapped to any team member (kept for Data Quality). */
  unmapped: string[];
  confidence: number;
}

/**
 * Splits combinations such as "Christopher/Antonio", "Hugo e Christopher", "Luiza / Bernardo".
 * "Todos" and non-team values (e.g. "JGP FA") are intentionally NOT mapped.
 */
export function parseAssignees(raw: string | null | undefined): AssigneeParse {
  const key = normalizeKey(raw);
  if (!key) return { members: [], unmapped: [], confidence: 1 };
  const tokens = key
    .split(/\s*(?:\/|,|;|\+|&|\be\b|\bde\b)\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
  const members: string[] = [];
  const unmapped: string[] = [];
  for (const token of tokens) {
    const member = TEAM_MEMBERS.find((m) => m.aliases.includes(token) || normalizeKey(m.name) === token);
    if (member) {
      if (!members.includes(member.key)) members.push(member.key);
    } else {
      unmapped.push(token);
    }
  }
  const confidence = tokens.length === 0 ? 1 : members.length / tokens.length;
  return { members, unmapped, confidence };
}
