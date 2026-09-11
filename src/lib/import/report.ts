import type { ImportSummary } from "./importer";

const ISSUE_LABELS: Record<string, string> = {
  MISSING_NAME: "Oportunidades sem nome",
  MISSING_DATE: "Oportunidades sem data de entrada",
  INVALID_YEAR: "Coluna year inválida (1900 / #VALUE!)",
  YEAR_MISMATCH: "Ano da planilha diferente da data",
  EXIT_BEFORE_ENTRY: "Data de saída anterior à entrada",
  AMOUNT_NOT_NUMERIC: "Valor não numérico (TBD, faixas)",
  STATUS_UNNORMALIZED: "Status/decisão não normalizado",
  TYPE_MISSING: "Tipo de operação vazio",
  TYPE_UNNORMALIZED: "Tipo de operação com mapeamento incerto",
  TYPE_SPHERE_INFERRED: "Esfera de precatório inferida pelo nome",
  NOT_AN_OPPORTUNITY: "Linhas que não são oportunidades (tarefas internas)",
  ASSIGNEE_UNMAPPED: "Responsável legado não mapeado",
  ORIGINATOR_MISSING: "Originador vazio",
  ORIGINATOR_UNCLASSIFIED: "Originador não classificado / ambíguo",
  ORIGINATOR_CATEGORY_UNMAPPED: "Tipo de contato não mapeado",
  COMPANY_UNIDENTIFIED: "Pessoa sem empresa identificada",
  POSSIBLE_DUPLICATE: "Possíveis duplicidades",
};

export function renderMigrationReport(s: ImportSummary): string {
  const lines: string[] = [];
  lines.push(`# Relatório de migração — ${s.fileName}`);
  lines.push("");
  lines.push(`- Batch: \`${s.batchId}\``);
  lines.push(`- SHA-256 do arquivo: \`${s.fileHash}\``);
  lines.push(`- Gerado em: ${new Date().toISOString()}`);
  lines.push(`- Abas lidas: ${s.sheets.join(", ")}`);
  lines.push("");
  lines.push("## Resumo");
  lines.push("");
  lines.push("| Métrica | Valor |");
  lines.push("|---|---:|");
  lines.push(`| Linhas na aba Pipe | ${s.pipeRows} |`);
  lines.push(`| Oportunidades criadas | ${s.created} |`);
  lines.push(`| Oportunidades atualizadas | ${s.updated} |`);
  lines.push(`| Linhas sem alteração (idempotência) | ${s.unchanged} |`);
  lines.push(`| Erros | ${s.errors} |`);
  lines.push(`| Empresas criadas | ${s.companiesCreated} |`);
  lines.push(`| Contatos criados | ${s.contactsCreated} |`);
  lines.push(`| Atividades históricas geradas | ${s.activitiesCreated} |`);
  lines.push(`| Oportunidades marcadas para revisão manual | ${s.needsReviewOpportunities} |`);
  lines.push(`| Problemas de qualidade em aberto | ${s.issuesTotal} |`);
  lines.push("");
  lines.push("## Registros por ano (calculado da data de entrada)");
  lines.push("");
  lines.push("| Ano | Registros |");
  lines.push("|---|---:|");
  for (const [y, n] of Object.entries(s.byYear).sort()) lines.push(`| ${y} | ${n} |`);
  lines.push("");
  lines.push("## Registros por status normalizado");
  lines.push("");
  lines.push("| Status | Registros |");
  lines.push("|---|---:|");
  for (const [k, n] of Object.entries(s.byStatus).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${n} |`);
  lines.push("");
  lines.push("## Registros por tipo normalizado");
  lines.push("");
  lines.push("| Tipo | Registros |");
  lines.push("|---|---:|");
  for (const [k, n] of Object.entries(s.byType).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${n} |`);
  lines.push("");
  lines.push("## Dados incompletos / inconsistentes (Data Quality)");
  lines.push("");
  lines.push("| Código | Descrição | Ocorrências |");
  lines.push("|---|---|---:|");
  for (const [code, n] of Object.entries(s.issuesByCode).sort((a, b) => b[1] - a[1])) lines.push(`| ${code} | ${ISSUE_LABELS[code] ?? code} | ${n} |`);
  lines.push("");
  lines.push("## Possíveis duplicidades na aba Pipe (não mescladas)");
  lines.push("");
  if (!s.possibleDuplicates.length) lines.push("Nenhuma.");
  for (const d of s.possibleDuplicates) lines.push(`- **${d.name}** — #${d.legacyIds.join(", #")}`);
  lines.push("");
  lines.push("## Responsáveis legados");
  lines.push("");
  lines.push("| Membro mapeado | Ocorrências |");
  lines.push("|---|---:|");
  for (const [k, n] of Object.entries(s.assigneeTokens).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${n} |`);
  lines.push("");
  lines.push("Tokens não mapeados (preservados em `assigneesRaw`, sinalizados em Data Quality):");
  lines.push("");
  for (const [k, n] of Object.entries(s.unmappedAssigneeTokens).sort((a, b) => b[1] - a[1])) lines.push(`- \`${k}\` — ${n}`);
  lines.push("");
  lines.push("## De/para de tipos de operação (editável em Administração → Tipos de operação)");
  lines.push("");
  lines.push("| Valor original | Tipo normalizado | Confiança | Revisar | Ocorrências |");
  lines.push("|---|---|---:|:-:|---:|");
  for (const m of s.typeMappings) lines.push(`| ${m.raw.replace(/\|/g, "\\|")} | ${m.slug} | ${Math.round(m.confidence * 100)}% | ${m.needsReview ? "sim" : ""} | ${m.occurrences} |`);
  lines.push("");
  lines.push("## Reconciliação com abas auxiliares");
  lines.push("");
  lines.push("Abas auxiliares nunca criam oportunidades: só enriquecem registros já existentes na aba Pipe (categoria do originador, responsáveis da aba Output, histórico de status).");
  lines.push("");
  lines.push("| Aba | Linhas | Casadas com Pipe | Sem correspondência | Enriquecimentos aplicados |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const e of s.enrichment) lines.push(`| ${e.sheet} | ${e.rows} | ${e.matched} | ${e.unmatched} | ${e.applied} |`);
  lines.push("");
  lines.push("| Aba de reunião vertical | Linhas | Casadas | Sem correspondência |");
  lines.push("|---|---:|---:|---:|");
  for (const m of s.meetings) lines.push(`| ${m.sheet} | ${m.rows} | ${m.matched} | ${m.unmatched} |`);
  lines.push("");
  lines.push("### Linhas de abas auxiliares sem correspondência na aba Pipe (revisão manual)");
  lines.push("");
  lines.push("Estas linhas NÃO foram importadas como oportunidades para evitar duplicidade. Ficam registradas em `ImportRow` com status `unmatched`.");
  lines.push("");
  lines.push("| Aba | Linha | Nome | Data |");
  lines.push("|---|---:|---|---|");
  for (const u of s.unmatchedAux) lines.push(`| ${u.sheet} | ${u.sourceRow} | ${(u.nome ?? "").replace(/\|/g, "\\|")} | ${u.data ?? ""} |`);
  lines.push("");
  return lines.join("\n");
}
