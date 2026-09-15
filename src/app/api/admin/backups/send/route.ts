import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runBackupEmail } from "@/lib/jobs/backup-email";

/** Admin-only: trigger the e-mailed backup now (same as the button on Administração → Backups). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { recipients?: string[] };
  const res = await runBackupEmail({ trigger: "manual", userId: session.user.id, recipients: body.recipients });
  return NextResponse.json(res, { status: res.ran && !res.error ? 200 : 500 });
}
