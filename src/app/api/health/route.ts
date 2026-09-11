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
    bootstrap = readFileSync("/app/bootstrap.log", "utf8").split("\n").filter((l) => l.startsWith("[leto]")).slice(-12);
  } catch {
    /* not running in the container */
  }
  return NextResponse.json({ ok: db.ok, db, bootstrap, env: { authUrl: !!process.env.AUTH_URL, appPassword: !!process.env.APP_PASSWORD, databaseUrl: !!process.env.DATABASE_URL, authSecret: !!process.env.AUTH_SECRET } }, { status: db.ok ? 200 : 503 });
}
