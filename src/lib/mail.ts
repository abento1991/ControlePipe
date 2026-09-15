export interface MailAttachment { filename: string; content: Buffer; contentType?: string }
export interface MailMessage { to: string[]; subject: string; text: string; html?: string; attachments?: MailAttachment[] }

/** Which delivery channel is configured: SMTP (any mailbox) or the Resend API. */
export function mailProvider(): "smtp" | "resend" | null {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function mailFrom(): string {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "Leto Pipeline <onboarding@resend.dev>";
}

/** Sends an e-mail through the configured provider. Throws with a readable message when nothing is configured. */
export async function sendMail(msg: MailMessage): Promise<{ provider: string; id: string | null }> {
  const provider = mailProvider();
  if (!provider) throw new Error("Envio de e-mail não configurado: defina SMTP_HOST/SMTP_USER/SMTP_PASS ou RESEND_API_KEY.");
  if (provider === "smtp") {
    // Loaded at runtime only: the instrumentation file is also compiled for the edge runtime, where node built-ins are absent.
    const nodemailer = (await import(/* webpackIgnore: true */ "nodemailer")).default as typeof import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    // Some hosts block one of the SMTP ports: try the configured port, then the other common one (587 <-> 465).
    const ports = port === 465 ? [465, 587] : [port, 465];
    let lastError: unknown = null;
    for (const p of ports) {
      try {
        const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: p, secure: process.env.SMTP_SECURE === "true" || p === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 20_000, greetingTimeout: 20_000, socketTimeout: 120_000 });
        const info = await transport.sendMail({ from: mailFrom(), to: msg.to.join(", "), subject: msg.subject, text: msg.text, html: msg.html, attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) });
        return { provider, id: info.messageId ?? null };
      } catch (e) {
        lastError = e;
        const code = (e as { code?: string }).code;
        if (!(code === "ETIMEDOUT" || code === "ECONNECTION" || code === "ESOCKET" || /timeout/i.test((e as Error).message))) throw e;
      }
    }
    throw new Error(`SMTP inacessível nas portas ${ports.join(" e ")} (${(lastError as Error)?.message ?? "timeout"}). O provedor de hospedagem pode bloquear SMTP; use a API do Resend.`);
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: mailFrom(), to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) }),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { id?: string };
  return { provider, id: data.id ?? null };
}
