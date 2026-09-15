import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db";

/** Liveness + a short bootstrap trail (no secrets) so a deployment can be diagnosed from outside. */
export async function GET() {
  let db: { ok: boolean; error?: string; opportunities?: number; users?: number } = { ok: false };
  try {
    const [opportunities, users] = await Promise.all([prisma.opportunity.count(), prisma.user.count()]);
    db = { ok: true, opportunities, users };
  } catch (e) {
    db = { ok: false, error: (e as Error).message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) };
  }
  let bootstrap: string[] = [];
  try {
    bootstrap = readFileSync("/app/bootstrap.log", "utf8").split("\n").filter((l) => l.trim()).map((l) => l.replace(/postgres(ql)?:\/\/[^\s"]+/g, "postgresql://***")).slice(-40);
  } catch {
    /* not running in the container */
  }
  return NextResponse.json({ ok: db.ok, db, bootstrap, env: { authUrl: !!process.env.AUTH_URL, appPassword: !!process.env.APP_PASSWORD, databaseUrl: !!process.env.DATABASE_URL, authSecret: !!process.env.AUTH_SECRET, mailProvider: process.env.SMTP_HOST ? "smtp" : process.env.RESEND_API_KEY ? "resend" : null, mailFrom: !!process.env.MAIL_FROM, backupRecipients: (process.env.BACKUP_EMAIL_TO || "").split(/[,;\s]+/).filter(Boolean).length } }, { status: db.ok ? 200 : 503 });
}
