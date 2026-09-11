import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OpportunityDetailDTO } from "./serialize";

const FIELD_LABELS: Record<string, string> = { status: "Status", amount: "Valor", assignees: "Responsáveis", operationType: "Tipo", operationTypeId: "Tipo", name: "Nome", nextAction: "Próxima ação", nextFollowUpAt: "Follow-up", companyId: "Empresa originadora", contactId: "Contato", closeReason: "Motivo", entryDate: "Data de entrada", description: "Descrição", entryChannel: "Canal", emailSubject: "Assunto do e-mail", sector: "Setor", economicGroup: "Grupo econômico", isDeleted: "Excluída" };
const ACTION_LABELS: Record<string, string> = { create: "criação", update: "edição", delete: "exclusão", reactivate: "reativação", close: "encerramento", import: "importação" };

export function AuditPanel({ logs }: { logs: OpportunityDetailDTO["auditLogs"] }) {
  if (!logs.length) return <p className="text-sm text-muted-foreground">Sem registros de auditoria.</p>;
  return (
    <div className="rounded-lg border bg-card shadow-card overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Quando</th>
            <th className="text-left px-3 py-2">Usuário</th>
            <th className="text-left px-3 py-2">Ação</th>
            <th className="text-left px-3 py-2">Campo</th>
            <th className="text-left px-3 py-2">Valor anterior</th>
            <th className="text-left px-3 py-2">Valor novo</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-1.5 tabular whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
              <td className="px-3 py-1.5">{l.user?.name ?? <span className="text-muted-foreground">sistema (importação)</span>}</td>
              <td className="px-3 py-1.5">
                <Badge variant="muted">{ACTION_LABELS[l.action] ?? l.action}</Badge>
              </td>
              <td className="px-3 py-1.5">{l.field ? FIELD_LABELS[l.field] ?? l.field : "—"}</td>
              <td className="px-3 py-1.5 text-muted-foreground max-w-[240px] truncate" title={l.oldValue ?? ""}>
                {l.oldValue ?? "—"}
              </td>
              <td className="px-3 py-1.5 max-w-[320px] truncate" title={l.newValue ?? ""}>
                {l.newValue ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PIPE_COLUMN_LABELS: Record<string, string> = { C: "#", D: "Tipo de Operação", E: "Nome", F: "Data Entrada", G: "year", H: "Contato", I: "Tipo de Contato", J: "Descrição da Oportunidade", K: "Status da Operação", L: "Valor (R$ mm)", M: "Responsável", N: "Decisão", O: "Data de Saída", P: "Feedback" };

export function RawDataPanel({ rows }: { rows: OpportunityDetailDTO["importRows"] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Valores exatamente como estavam na planilha (raw_import_data). Nada é alterado aqui; a normalização vive nos campos da oportunidade.</p>
      {rows.map((r) => (
        <div key={`${r.sheet}-${r.sourceRow}`} className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-2 border-b text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
            <span>
              {r.sourceWorkbook} · aba “{r.sheet}” · linha {r.sourceRow}
            </span>
            <span>{r.status}</span>
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y">
              {Object.entries(r.rawData).map(([col, val]) => (
                <tr key={col}>
                  <td className="px-4 py-1.5 w-56 text-muted-foreground align-top">
                    {r.sheet === "Pipe" ? PIPE_COLUMN_LABELS[col] ?? col : col} <span className="text-[10px] opacity-60">({col})</span>
                  </td>
                  <td className="px-4 py-1.5 whitespace-pre-wrap font-mono text-[11px]">{val === null || val === undefined ? <span className="text-muted-foreground italic">vazio</span> : String(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
