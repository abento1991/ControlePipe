import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminTaskUpdates } from "@/lib/queries/admin-tasks";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  return NextResponse.json({ entries: await getAdminTaskUpdates(id) });
}
