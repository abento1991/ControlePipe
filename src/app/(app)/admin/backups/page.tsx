import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { backupSchedule, BACKUP_JOB } from "@/lib/jobs/backup-email";
import { SendBackupButton } from "@/components/admin/send-backup-button";

export const metadata = { title: "Backups" };
export const dynamic = "force-dynamic";

const DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export default async function BackupsPage() {
  await requireAdmin();
  const s = backupSchedule();
  const runs = await prisma.jobRun.findMany({ where: { job: BACKUP_JOB }, orderBy: { startedAt: "desc" }, take: 60 });
  const lastOk = runs.find((r) => r.status === "OK");
  return (
    <>
      <PageHeader eyebrow="Special Situations · Administração" title="Backups por e-mail" description="O app gera o Excel completo (mesmo arquivo do botão “Exportar Excel”) e envia por e-mail no horário programado. Cada envio fica registrado abaixo.">
        <SendBackupButton defaultRecipients={s.recipients} configured={!!s.provider} />
      </PageHeader>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card shadow-card p-4 text-xs space-y-2">
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Configuração atual</div>
          <Row label="Envio de e-mail">{s.provider ? <Badge variant="success">{s.provider === "smtp" ? "SMTP configurado" : "Resend configurado"}</Badge> : <Badge variant="danger">não configurado</Badge>}</Row>
          <Row label="Destinatários">{s.recipients.length ? s.recipients.join(", ") : <span className="text-danger">nenhum (BACKUP_EMAIL_TO)</span>}</Row>
          <Row label="Frequência">{s.frequency === "daily" ? `diária, às ${String(s.hour).padStart(2, "0")}h (horário de São Paulo)` : `semanal, toda ${DAYS[s.day]} às ${String(s.hour).padStart(2, "0")}h (horário de São Paulo)`}</Row>
          <Row label="Agendamento">{s.enabled ? <Badge variant="success">ativo</Badge> : <Badge variant="warning">inativo até configurar</Badge>}</Row>
          <Row label="Último envio OK">{lastOk ? `${formatDateTime(lastOk.finishedAt ?? lastOk.startedAt)} · ${lastOk.bytes ? `${(lastOk.bytes / 1024 / 1024).toFixed(1)} MB` : ""}` : "nunca"}</Row>
          <div className="pt-2 text-2xs text-muted-foreground leading-relaxed">
            Variáveis no Railway: <code>BACKUP_EMAIL_TO</code> (lista separada por vírgula), <code>BACKUP_FREQUENCY</code> (<code>weekly</code> ou <code>daily</code>), <code>BACKUP_DAY</code> (0 = domingo … 6 = sábado), <code>BACKUP_HOUR</code> (0–23). Envio por SMTP: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>MAIL_FROM</code>. Ou pela API do Resend: <code>RESEND_API_KEY</code> e <code>MAIL_FROM</code>.
          </div>
        </div>
        <div className="xl:col-span-2 rounded-lg border bg-card shadow-card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Início</th>
                <th className="text-left px-3 py-2">Disparo</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Destinatários</th>
                <th className="text-right px-3 py-2">Tamanho</th>
                <th className="text-left px-3 py-2">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular">
              {!runs.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum envio ainda. Use “Enviar backup agora” para testar a configuração.</td>
                </tr>
              )}
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-1.5 whitespace-nowrap">{formatDateTime(r.startedAt)}</td>
                  <td className="px-3 py-1.5">{r.trigger === "manual" ? "manual" : "automático"}</td>
                  <td className="px-3 py-1.5"><Badge variant={r.status === "OK" ? "success" : r.status === "ERROR" ? "danger" : "warning"}>{r.status}</Badge></td>
                  <td className="px-3 py-1.5 max-w-[220px] truncate" title={r.recipients ?? ""}>{r.recipients ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{r.bytes ? `${(r.bytes / 1024 / 1024).toFixed(1)} MB` : "—"}</td>
                  <td className="px-3 py-1.5 max-w-[360px] truncate text-muted-foreground" title={r.detail ?? ""}>{r.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-[120px] shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
