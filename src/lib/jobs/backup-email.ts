import { prisma } from "../db";
import { buildBackupWorkbook } from "../backup";
import { sendMail, mailProvider } from "../mail";

export const BACKUP_JOB = "backup-email";
const TZ = "America/Sao_Paulo";

export interface BackupSchedule { enabled: boolean; recipients: string[]; frequency: "daily" | "weekly"; day: number; hour: number; provider: "smtp" | "resend" | null }

/** Schedule from environment: BACKUP_EMAIL_TO (comma list), BACKUP_FREQUENCY daily|weekly, BACKUP_DAY 0-6 (Sun-Sat), BACKUP_HOUR 0-23 (São Paulo time). */
export function backupSchedule(): BackupSchedule {
  const recipients = (process.env.BACKUP_EMAIL_TO || "").split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  const frequency = process.env.BACKUP_FREQUENCY === "daily" ? "daily" : "weekly";
  const day = Math.min(6, Math.max(0, Number(process.env.BACKUP_DAY ?? 1) || 0));
  const hour = Math.min(23, Math.max(0, Number(process.env.BACKUP_HOUR ?? 6) || 0));
  return { enabled: recipients.length > 0 && !!mailProvider(), recipients, frequency, day, hour, provider: mailProvider() };
}

function localParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false, weekday: "short" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24, weekday };
}

/** The period this moment belongs to, or null when the scheduled time has not come yet. */
export function scheduledBucket(now: Date = new Date(), s: BackupSchedule = backupSchedule()): string | null {
  const { date, hour, weekday } = localParts(now);
  if (hour < s.hour) return null;
  if (s.frequency === "daily") return date;
  if (weekday !== s.day) return null;
  return `week-${date}`;
}

/** Builds the workbook and e-mails it, recording the run. Idempotent per bucket: a second call for the same bucket is a no-op. */
export async function runBackupEmail(opts: { trigger: "scheduled" | "manual"; bucket?: string; userId?: string | null; recipients?: string[] }): Promise<{ ran: boolean; runId?: string; error?: string }> {
  const s = backupSchedule();
  const recipients = opts.recipients?.length ? opts.recipients : s.recipients;
  const bucket = opts.bucket ?? `manual-${Date.now()}`;
  if (await prisma.jobRun.findUnique({ where: { job_bucket: { job: BACKUP_JOB, bucket } } })) return { ran: false }; // already sent for this period
  let run;
  try {
    run = await prisma.jobRun.create({ data: { job: BACKUP_JOB, bucket, trigger: opts.trigger, userId: opts.userId ?? null, recipients: recipients.join(", ") } });
  } catch {
    return { ran: false }; // another instance already took this bucket
  }
  try {
    if (!recipients.length) throw new Error("Nenhum destinatário: defina BACKUP_EMAIL_TO.");
    const { buffer, filename, counts } = await buildBackupWorkbook();
    const stamp = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date());
    const summary = `Oportunidades: ${counts.oportunidades} · Histórico: ${counts.historico} · Empresas: ${counts.empresas} · Contatos: ${counts.contatos} · Tarefas administrativas: ${counts.tarefas}`;
    const text = `Backup do Leto Special Situations gerado em ${stamp} (${opts.trigger === "manual" ? "envio manual" : "envio automático"}).\n\n${summary}\n\nO arquivo em anexo tem todas as abas e substitui a planilha de acompanhamento. Guarde-o em local seguro.`;
    // One message per recipient: a provider restriction on one address (e.g. Resend before domain verification)
    // must not block the others. The run is OK when at least one delivery succeeded.
    const results: string[] = [];
    let okCount = 0;
    for (const to of recipients) {
      try {
        const sent = await sendMail({ to: [to], subject: `[Leto SS] Backup do pipe · ${stamp}`, text, attachments: [{ filename, content: buffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }] });
        okCount++;
        results.push(`${to}: OK (${sent.provider}${sent.id ? ` ${sent.id}` : ""})`);
      } catch (e) {
        results.push(`${to}: ERRO ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
      }
    }
    const detail = `${results.join(" | ")} · ${summary}`.slice(0, 1000);
    await prisma.jobRun.update({ where: { id: run.id }, data: { status: okCount ? "OK" : "ERROR", finishedAt: new Date(), bytes: buffer.length, detail } });
    if (!okCount) return { ran: true, runId: run.id, error: results.join(" | ") };
    return { ran: true, runId: run.id, error: okCount < recipients.length ? `Enviado para ${okCount} de ${recipients.length}: ${results.filter((r) => r.includes("ERRO")).join(" | ")}` : undefined };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await prisma.jobRun.update({ where: { id: run.id }, data: { status: "ERROR", finishedAt: new Date(), detail: error.slice(0, 1000) } });
    return { ran: true, runId: run.id, error };
  }
}

/** Called periodically by the in-process scheduler; sends when the scheduled time for the current period has come. */
export async function backupTick(now: Date = new Date()): Promise<void> {
  const s = backupSchedule();
  if (!s.enabled) return;
  const bucket = scheduledBucket(now, s);
  if (!bucket) return;
  const res = await runBackupEmail({ trigger: "scheduled", bucket });
  if (res.ran) console.log(`[jobs] ${BACKUP_JOB} ${bucket}: ${res.error ? `ERROR ${res.error}` : "sent"}`);
}
