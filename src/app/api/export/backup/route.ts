import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildBackupWorkbook } from "@/lib/backup";

/** Manual download of the full backup workbook (same file the scheduled e-mail sends). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { buffer, filename } = await buildBackupWorkbook();
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"` } });
}
