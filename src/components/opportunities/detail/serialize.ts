import type { OpportunityDetail } from "@/lib/queries/opportunities";

/** Converts Prisma Dates/Decimals into a JSON-safe structure for the client detail view. */
export function serializeOpportunity(o: OpportunityDetail) {
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  const isOpen = o.status.group === "ACTIVE" || o.status.group === "ON_HOLD" || o.status.group === "LEGACY";
  const end = isOpen ? new Date() : o.exitDate ?? o.lastActivityAt ?? o.updatedAt;
  const daysInPipeline = o.entryDate ? Math.max(0, Math.floor((end.getTime() - o.entryDate.getTime()) / 86400000)) : null;
  const primary = o.originators.find((x) => x.role === "PRIMARY") ?? o.originators[0] ?? null;
  return {
    id: o.id,
    legacyId: o.legacyId,
    name: o.name,
    nameRaw: o.nameRaw,
    economicGroup: o.economicGroup,
    description: o.description,
    sector: o.sector,
    operationType: o.operationType ? { id: o.operationType.id, name: o.operationType.name, color: o.operationType.color, category: o.operationType.category } : null,
    operationTypeRaw: o.operationTypeRaw,
    status: { id: o.status.id, key: o.status.key, name: o.status.name, group: o.status.group, outcome: o.status.outcome, color: o.status.color },
    statusRaw: o.statusRaw,
    legacyStatusText: o.legacyStatusText,
    legacyFeedback: o.legacyFeedback,
    entryDate: iso(o.entryDate),
    entryDateRaw: o.entryDateRaw,
    entryYear: o.entryYear,
    entryYearRaw: o.entryYearRaw,
    exitDate: iso(o.exitDate),
    amount: o.amount === null ? null : Number(o.amount),
    amountRaw: o.amountRaw,
    entryChannel: o.entryChannel,
    emailSubject: o.emailSubject,
    emailSender: o.emailSender,
    emailDate: iso(o.emailDate),
    whatsappContact: o.whatsappContact,
    whatsappNumber: o.whatsappNumber,
    whatsappSummary: o.whatsappSummary,
    firstContactAt: iso(o.firstContactAt),
    nextAction: o.nextAction,
    nextFollowUpAt: iso(o.nextFollowUpAt),
    lastActivityAt: iso(o.lastActivityAt),
    closedAt: iso(o.closedAt),
    closeReason: o.closeReason,
    assigneesRaw: o.assigneesRaw,
    originatorRaw: o.originatorRaw,
    originatorTypeRaw: o.originatorTypeRaw,
    originatorCategory: o.originatorCategory,
    needsReview: o.needsReview,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    createdBy: o.createdBy,
    daysInPipeline,
    assignees: o.assignees.map((a) => ({ ...a.user, isPrimary: a.isPrimary })),
    originator: primary
      ? {
          company: primary.company ? { id: primary.company.id, name: primary.company.name, category: primary.company.category, website: primary.company.website } : null,
          contact: primary.contact ? { id: primary.contact.id, fullName: primary.contact.fullName, email: primary.contact.email, phone: primary.contact.phone, whatsapp: primary.contact.whatsapp, title: primary.contact.title, linkedin: primary.contact.linkedin } : null,
          rawText: primary.rawText,
          confidence: primary.confidence,
          migrationNotes: primary.migrationNotes,
          needsReview: primary.needsReview,
        }
      : null,
    notes: o.notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), user: n.user })),
    activities: o.activities.map((a) => ({ id: a.id, type: a.type, title: a.title, body: a.body, occurredAt: a.occurredAt.toISOString(), isLegacy: a.isLegacy, sourceSheet: a.sourceSheet, sourceRow: a.sourceRow, metadata: (a.metadata as Record<string, unknown> | null) ?? null, user: a.user })),
    followUps: o.followUps.map((f) => ({ id: f.id, dueAt: f.dueAt.toISOString(), action: f.action, completedAt: iso(f.completedAt), user: f.user })),
    attachments: o.attachments.map((a) => ({ id: a.id, kind: a.kind, fileName: a.fileName, url: a.url, mimeType: a.mimeType, createdAt: a.createdAt.toISOString(), user: a.user })),
    auditLogs: o.auditLogs.map((l) => ({ id: l.id, action: l.action, field: l.field, oldValue: l.oldValue, newValue: l.newValue, createdAt: l.createdAt.toISOString(), user: l.user })),
    issues: o.issues.map((i) => ({ id: i.id, code: i.code, severity: i.severity, message: i.message })),
    importRows: o.importRows.map((r) => ({ sheet: r.sheet, sourceRow: r.sourceRow, sourceWorkbook: r.sourceWorkbook, rawData: r.rawData as Record<string, unknown>, status: r.status })),
  };
}

export type OpportunityDetailDTO = ReturnType<typeof serializeOpportunity>;
