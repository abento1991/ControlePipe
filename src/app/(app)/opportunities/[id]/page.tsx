import { notFound } from "next/navigation";
import { getOpportunity } from "@/lib/queries/opportunities";
import { requireUser } from "@/lib/session";
import { OpportunityDetailView } from "@/components/opportunities/detail/opportunity-detail-view";
import { serializeOpportunity } from "@/components/opportunities/detail/serialize";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  return { title: opp?.name ?? "Oportunidade" };
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const opp = await getOpportunity(id);
  if (!opp) notFound();
  return <OpportunityDetailView data={serializeOpportunity(opp)} isAdmin={user.role === "ADMIN"} />;
}
