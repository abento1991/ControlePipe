import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCompany } from "@/lib/queries/originators";
import { CompanyDetailView } from "@/components/originators/entity-detail";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const c = await getCompany(id);
  if (!c) notFound();
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return (
    <CompanyDetailView
      c={{
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        category: c.category,
        categoryRaw: c.categoryRaw,
        website: c.website,
        address: c.address,
        notes: c.notes,
        relationship: c.relationship,
        lastInteractionAt: iso(c.lastInteractionAt),
        migrationConfidence: c.migrationConfidence,
        migrationNotes: c.migrationNotes,
        needsReview: c.needsReview,
        aliases: c.aliases.map((a) => a.alias),
        contacts: c.contacts.map((p) => ({ id: p.id, fullName: p.fullName, title: p.title, email: p.email, phone: p.phone, whatsapp: p.whatsapp })),
        opportunities: c.originations.map((o) => ({ id: o.opportunity.id, name: o.opportunity.name, entryDate: iso(o.opportunity.entryDate), amount: o.opportunity.amount === null ? null : Number(o.opportunity.amount), status: o.opportunity.status, operationType: o.opportunity.operationType, lastActivityAt: iso(o.opportunity.lastActivityAt), nextFollowUpAt: iso(o.opportunity.nextFollowUpAt), contactName: o.contact?.fullName ?? null })),
        interactions: c.interactions.map((i) => ({ id: i.id, type: i.type, summary: i.summary, occurredAt: i.occurredAt.toISOString(), user: i.user })),
      }}
    />
  );
}
