import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getContact } from "@/lib/queries/originators";
import { ContactDetailView } from "@/components/originators/entity-detail";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const c = await getContact(id);
  if (!c) notFound();
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return (
    <ContactDetailView
      c={{
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        fullName: c.fullName,
        title: c.title,
        email: c.email,
        phone: c.phone,
        whatsapp: c.whatsapp,
        linkedin: c.linkedin,
        category: c.category,
        notes: c.notes,
        relationship: c.relationship,
        lastContactAt: iso(c.lastContactAt),
        nextFollowUpAt: iso(c.nextFollowUpAt),
        migrationConfidence: c.migrationConfidence,
        migrationNotes: c.migrationNotes,
        needsReview: c.needsReview,
        company: c.company ? { id: c.company.id, name: c.company.name, category: c.company.category } : null,
        opportunities: c.originations.map((o) => ({ id: o.opportunity.id, name: o.opportunity.name, entryDate: iso(o.opportunity.entryDate), amount: o.opportunity.amount === null ? null : Number(o.opportunity.amount), status: o.opportunity.status, operationType: o.opportunity.operationType, lastActivityAt: iso(o.opportunity.lastActivityAt), nextFollowUpAt: iso(o.opportunity.nextFollowUpAt) })),
        interactions: c.interactions.map((i) => ({ id: i.id, type: i.type, summary: i.summary, occurredAt: i.occurredAt.toISOString(), user: i.user })),
      }}
    />
  );
}
