import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** History entries for one opportunity (used by the table's "Atualizações" popover). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const [activities, opp] = await Promise.all([
    prisma.activity.findMany({ where: { opportunityId: id, type: { notIn: ["IMPORTED", "ASSIGNEE_CHANGED"] } }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 200, select: { id: true, type: true, title: true, body: true, occurredAt: true, isLegacy: true, metadata: true, user: { select: { name: true } } } }),
    prisma.opportunity.findUnique({ where: { id }, select: { legacyFeedback: true, closeReason: true } }),
  ]);
  return NextResponse.json({
    entries: activities.map((a) => ({ id: a.id, type: a.type, title: a.title, body: a.body, date: a.occurredAt.toISOString(), isLegacy: a.isLegacy, inferred: (a.metadata as { dateInferred?: boolean } | null)?.dateInferred === true, user: a.user?.name ?? null })),
    legacyFeedback: opp?.legacyFeedback ?? null,
    closeReason: opp?.closeReason ?? null,
  });
}
