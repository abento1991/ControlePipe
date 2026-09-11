import type { PrismaClient, Prisma, CompanyCategory, ActivityType } from "@prisma/client";
import { createHash } from "node:crypto";
import { parseWorkbook, type ParsedWorkbook, type PipeRow } from "./workbook";
import { seedReferenceData } from "../seed-reference";
import { normalizeKey, cleanText } from "../normalization/text";
import { normalizeDecision } from "../normalization/status";
import { classifyOperationType, inferPrecatorioSphereFromName } from "../normalization/operation-types";
import { parseAssignees, TEAM_MEMBERS } from "../normalization/assignees";
import { parseOriginatorCell, mapOriginatorCategory, canonicalCompanyName, looksLikePerson, splitPersonName, type KnownOriginator, type CompanyCategoryKey } from "../normalization/originators";
import { parseLegacyLog } from "../normalization/legacy-timeline";
import { parseAmount, parseSheetDate, parseYear } from "../normalization/values";

export interface ImportOptions {
  filePath: string;
  userId?: string | null;
  log?: (message: string) => void;
}

export interface IssueDraft {
  code: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  details?: Record<string, unknown>;
}

export interface ImportSummary {
  batchId: string;
  fileName: string;
  fileHash: string;
  sheets: string[];
  pipeRows: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  companiesCreated: number;
  contactsCreated: number;
  activitiesCreated: number;
  enrichment: { sheet: string; rows: number; matched: number; unmatched: number; applied: number }[];
  meetings: { sheet: string; rows: number; matched: number; unmatched: number }[];
  issuesByCode: Record<string, number>;
  issuesTotal: number;
  possibleDuplicates: { name: string; legacyIds: number[] }[];
  needsReviewOpportunities: number;
  unmatchedAux: { sheet: string; sourceRow: number; nome: string | null; data: string | null }[];
  byYear: Record<string, number>;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  typeMappings: { raw: string; slug: string; confidence: number; needsReview: boolean; occurrences: number }[];
  assigneeTokens: Record<string, number>;
  unmappedAssigneeTokens: Record<string, number>;
}

type Ctx = {
  prisma: PrismaClient;
  batchId: string;
  workbook: ParsedWorkbook;
  log: (m: string) => void;
  statusIds: Map<string, string>;
  typeIdsBySlug: Map<string, string>;
  userIdsByKey: Map<string, string>;
  companyCache: Map<string, string>; // normalizedName → id
  contactCache: Map<string, string>; // `${normalizedName}|${companyId ?? ""}` → id
  known: Map<string, KnownOriginator>;
  counters: { companies: number; contacts: number; activities: number };
  typeMappingCache: Map<string, { slug: string; confidence: number; needsReview: boolean; note?: string; source: string }>;
};

function hashObject(obj: unknown): string {
  return createHash("sha1").update(JSON.stringify(obj)).digest("hex");
}

function isoDay(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

async function resolveCompany(ctx: Ctx, name: string, category: CompanyCategoryKey | null, meta: { confidence?: number; notes?: string; needsReview?: boolean; categoryRaw?: string | null }): Promise<string> {
  const canonical = canonicalCompanyName(name);
  const key = normalizeKey(canonical);
  const cached = ctx.companyCache.get(key);
  if (cached) {
    if (category) {
      // Fill category when the cached company has none yet.
      const existing = await ctx.prisma.company.findUnique({ where: { id: cached }, select: { category: true, categoryRaw: true } });
      if (existing && existing.category === "OUTROS") {
        await ctx.prisma.company.update({ where: { id: cached }, data: { category: category as CompanyCategory, categoryRaw: meta.categoryRaw ?? null } });
      }
    }
    return cached;
  }
  const existing = await ctx.prisma.company.findUnique({ where: { normalizedName: key } });
  if (existing) {
    ctx.companyCache.set(key, existing.id);
    return existing.id;
  }
  const created = await ctx.prisma.company.create({
    data: {
      name: canonical,
      normalizedName: key,
      category: (category ?? "OUTROS") as CompanyCategory,
      categoryRaw: meta.categoryRaw ?? null,
      migrationConfidence: meta.confidence ?? null,
      migrationNotes: meta.notes ?? null,
      needsReview: meta.needsReview ?? false,
    },
  });
  if (normalizeKey(name) !== key) {
    await ctx.prisma.companyAlias.upsert({ where: { alias: name.trim() }, update: {}, create: { alias: name.trim(), companyId: created.id } });
  }
  ctx.companyCache.set(key, created.id);
  ctx.counters.companies++;
  return created.id;
}

async function resolveContact(ctx: Ctx, fullName: string, companyId: string | null, category: CompanyCategoryKey | null, meta: { confidence?: number; notes?: string; needsReview?: boolean }): Promise<string> {
  const clean = fullName.replace(/\s+/g, " ").trim();
  const key = normalizeKey(clean);
  const cacheKey = `${key}|${companyId ?? ""}`;
  const cached = ctx.contactCache.get(cacheKey);
  if (cached) return cached;
  // 1) same person already linked to this company; 2) same person with no company (attach it now);
  // 3) same person known at another company when this row has no company (reuse, do not duplicate).
  const sameCompany = companyId ? await ctx.prisma.contact.findFirst({ where: { normalizedName: key, companyId } }) : null;
  if (sameCompany) {
    ctx.contactCache.set(cacheKey, sameCompany.id);
    return sameCompany.id;
  }
  const orphan = await ctx.prisma.contact.findFirst({ where: { normalizedName: key, companyId: null } });
  if (orphan) {
    if (companyId) await ctx.prisma.contact.update({ where: { id: orphan.id }, data: { companyId } });
    ctx.contactCache.set(cacheKey, orphan.id);
    return orphan.id;
  }
  if (!companyId) {
    const anyCompany = await ctx.prisma.contact.findFirst({ where: { normalizedName: key }, orderBy: { createdAt: "asc" } });
    if (anyCompany) {
      ctx.contactCache.set(cacheKey, anyCompany.id);
      return anyCompany.id;
    }
  }
  const { firstName, lastName } = splitPersonName(clean);
  const created = await ctx.prisma.contact.create({
    data: {
      firstName,
      lastName,
      fullName: clean,
      normalizedName: key,
      companyId,
      category: (category ?? null) as CompanyCategory | null,
      migrationConfidence: meta.confidence ?? null,
      migrationNotes: meta.notes ?? null,
      needsReview: meta.needsReview ?? false,
    },
  });
  ctx.contactCache.set(cacheKey, created.id);
  ctx.counters.contacts++;
  return created.id;
}

async function upsertTypeMapping(ctx: Ctx, raw: string | null, occurrences: number, nameHint: string | null) {
  const rawKey = raw ?? "";
  const cached = ctx.typeMappingCache.get(rawKey);
  if (cached) return cached;
  const existing = raw ? await ctx.prisma.operationTypeMapping.findUnique({ where: { rawValue: raw }, include: { operationType: true } }) : null;
  if (existing && existing.source === "manual" && existing.operationType) {
    const m = { slug: existing.operationType.slug, confidence: existing.confidence, needsReview: existing.needsReview, source: "manual", note: undefined as string | undefined };
    ctx.typeMappingCache.set(rawKey, m);
    await ctx.prisma.operationTypeMapping.update({ where: { id: existing.id }, data: { occurrences } });
    return m;
  }
  const cls = classifyOperationType(raw);
  void nameHint;
  if (raw) {
    const typeId = ctx.typeIdsBySlug.get(cls.slug) ?? null;
    await ctx.prisma.operationTypeMapping.upsert({
      where: { rawValue: raw },
      update: { normalizedKey: cls.slug, operationTypeId: typeId, confidence: cls.confidence, needsReview: cls.needsReview, occurrences, source: "rule" },
      create: { rawValue: raw, normalizedKey: cls.slug, operationTypeId: typeId, confidence: cls.confidence, needsReview: cls.needsReview, occurrences, source: "rule" },
    });
  }
  const m = { slug: cls.slug, confidence: cls.confidence, needsReview: cls.needsReview, note: cls.note, source: "rule" };
  ctx.typeMappingCache.set(rawKey, m);
  return m;
}

async function syncIssues(ctx: Ctx, entity: string, entityId: string, opportunityId: string | null, drafts: IssueDraft[]) {
  const codes = new Set(drafts.map((d) => d.code));
  const existing = await ctx.prisma.dataQualityIssue.findMany({ where: { entity, entityId } });
  for (const d of drafts) {
    await ctx.prisma.dataQualityIssue.upsert({
      where: { code_entity_entityId: { code: d.code, entity, entityId } },
      update: { message: d.message, details: (d.details ?? {}) as Prisma.InputJsonValue, severity: d.severity, opportunityId },
      create: { code: d.code, entity, entityId, opportunityId, message: d.message, details: (d.details ?? {}) as Prisma.InputJsonValue, severity: d.severity },
    });
  }
  for (const e of existing) {
    if (!codes.has(e.code) && !e.resolved) {
      await ctx.prisma.dataQualityIssue.update({ where: { id: e.id }, data: { resolved: true, resolvedAt: new Date(), resolutionNote: "Resolvido automaticamente: condição não se aplica mais após reimportação." } });
    }
  }
}

interface RowResult {
  opportunityId: string;
  action: "created" | "updated" | "unchanged" | "error";
  needsReview: boolean;
  issues: IssueDraft[];
  statusKey: string;
  typeSlug: string;
  entryYear: number | null;
  assigneeTokens: string[];
  unmappedTokens: string[];
}

async function importPipeRow(ctx: Ctx, row: PipeRow, typeOccurrences: Map<string, number>): Promise<RowResult> {
  const { prisma } = ctx;
  const rawHash = hashObject(row.raw);
  const sourceWorkbook = ctx.workbook.fileName;

  const existingRow = await prisma.importRow.findUnique({ where: { sourceWorkbook_sheet_sourceRow: { sourceWorkbook, sheet: "Pipe", sourceRow: row.sourceRow } } });
  const existingOpp = await prisma.opportunity.findUnique({ where: { legacyId: row.legacyId }, include: { status: true, operationType: true } });

  // ── Normalization ───────────────────────────────────────────────────────
  const issues: IssueDraft[] = [];
  const nameRaw = row.nome;
  const name = nameRaw ?? `(sem nome) #${row.legacyId}`;
  if (!nameRaw) issues.push({ code: "MISSING_NAME", severity: "ERROR", message: "Oportunidade sem nome na planilha." });

  const entry = parseSheetDate(row.dataEntrada);
  const year = parseYear(row.year);
  if (!entry.date) issues.push({ code: "MISSING_DATE", severity: "ERROR", message: entry.note ?? "Oportunidade sem data de entrada.", details: { raw: entry.raw } });
  if (year.raw !== null && year.year === null) issues.push({ code: "INVALID_YEAR", severity: "WARNING", message: `Coluna year com valor inválido "${year.raw}".`, details: { raw: year.raw } });
  if (entry.date && year.year && entry.date.getUTCFullYear() !== year.year) {
    issues.push({ code: "YEAR_MISMATCH", severity: "WARNING", message: `Ano da planilha (${year.year}) difere da data de entrada (${isoDay(entry.date)}).` });
  }
  const entryYear = entry.date ? entry.date.getUTCFullYear() : year.year;

  const exit = parseSheetDate(row.dataSaida);
  if (entry.date && exit.date && exit.date < entry.date) {
    issues.push({ code: "EXIT_BEFORE_ENTRY", severity: "WARNING", message: `Data de saída (${isoDay(exit.date)}) anterior à data de entrada (${isoDay(entry.date)}).` });
  }

  const amount = parseAmount(row.valor);
  if (amount.note) issues.push({ code: "AMOUNT_NOT_NUMERIC", severity: "INFO", message: amount.note, details: { raw: amount.raw } });

  const decision = normalizeDecision(row.decisao);
  if (decision.key === "LEGACY_UNCLASSIFIED") {
    issues.push({ code: "STATUS_UNNORMALIZED", severity: "WARNING", message: decision.note ?? "Status não normalizado.", details: { raw: row.decisao } });
  }

  const mapping = await upsertTypeMapping(ctx, row.tipoOperacao, typeOccurrences.get(row.tipoOperacao ?? "") ?? 0, row.nome);
  let typeSlug = mapping.slug;
  if (!row.tipoOperacao) {
    issues.push({ code: "TYPE_MISSING", severity: "WARNING", message: "Tipo de operação vazio na planilha." });
  } else if (mapping.needsReview) {
    issues.push({ code: "TYPE_UNNORMALIZED", severity: "WARNING", message: `Tipo "${row.tipoOperacao}" mapeado para "${mapping.slug}" com confiança ${Math.round(mapping.confidence * 100)}%.${mapping.note ? ` ${mapping.note}` : ""}`, details: { raw: row.tipoOperacao, slug: mapping.slug, confidence: mapping.confidence } });
  }
  if (typeSlug === "precatorio-nao-identificado" || typeSlug === "pre-precatorio") {
    const inferred = inferPrecatorioSphereFromName(row.nome);
    if (inferred) {
      const target = typeSlug === "pre-precatorio" ? inferred.slug.replace("precatorio-", "pre-precatorio-") : inferred.slug;
      if (ctx.typeIdsBySlug.has(target)) {
        typeSlug = target;
        issues.push({ code: "TYPE_SPHERE_INFERRED", severity: "INFO", message: `Esfera "${inferred.hint}" inferida a partir do nome "${row.nome}". Tipo original: "${row.tipoOperacao}".`, details: { raw: row.tipoOperacao, inferred: target } });
      }
    }
  }
  if (typeSlug === "nao-e-oportunidade") {
    issues.push({ code: "NOT_AN_OPPORTUNITY", severity: "INFO", message: "Linha registra tarefa interna/apresentação, não uma oportunidade de investimento." });
  }

  const assignees = parseAssignees(row.responsavel);
  if (assignees.unmapped.length) {
    issues.push({ code: "ASSIGNEE_UNMAPPED", severity: "WARNING", message: `Responsável "${row.responsavel}" contém valores não mapeados: ${assignees.unmapped.join(", ")}.`, details: { raw: row.responsavel, unmapped: assignees.unmapped } });
  }

  const typeHint = mapOriginatorCategory(row.tipoContato);
  const originator = parseOriginatorCell(row.contato, { known: ctx.known, typeHint });
  if (row.tipoContato && !typeHint) {
    issues.push({ code: "ORIGINATOR_CATEGORY_UNMAPPED", severity: "INFO", message: `Tipo de contato "${row.tipoContato}" não mapeado para categoria.`, details: { raw: row.tipoContato } });
  }

  let companyId: string | null = null;
  let contactId: string | null = null;
  let originatorCategory: CompanyCategoryKey | null = null;
  if (originator.companyName) {
    // A category hint from the row only describes the company when the cell is the company itself.
    const knownCompany = ctx.known.get(normalizeKey(canonicalCompanyName(originator.companyName)))?.category ?? null;
    const cat = originator.personName ? knownCompany : originator.category ?? knownCompany ?? typeHint ?? null;
    companyId = await resolveCompany(ctx, originator.companyName, cat, { confidence: originator.confidence, notes: originator.notes.join("; "), needsReview: originator.needsReview, categoryRaw: originator.personName ? null : row.tipoContato });
  }
  if (originator.personName) {
    const cat = originator.category ?? typeHint ?? null;
    contactId = await resolveContact(ctx, originator.personName, companyId, cat, { confidence: originator.confidence, notes: originator.notes.join("; "), needsReview: originator.needsReview });
    if (originator.title) await prisma.contact.updateMany({ where: { id: contactId, title: null }, data: { title: originator.title } });
  }
  let companyCategory: CompanyCategoryKey | null = null;
  let contactCategory: CompanyCategoryKey | null = null;
  if (companyId) {
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { category: true } });
    if (c && c.category !== "OUTROS") companyCategory = c.category as CompanyCategoryKey;
  }
  if (contactId) {
    const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { category: true } });
    if (c?.category) contactCategory = c.category as CompanyCategoryKey;
  }
  originatorCategory = companyCategory ?? typeHint ?? contactCategory ?? originator.category ?? null;

  if (originator.kind === "empty") {
    issues.push({ code: "ORIGINATOR_MISSING", severity: "INFO", message: "Contato/originador vazio na planilha." });
  } else if (originator.needsReview || originator.kind === "ambiguous") {
    issues.push({ code: "ORIGINATOR_UNCLASSIFIED", severity: "WARNING", message: `Originador "${row.contato}" precisa de revisão: ${originator.notes.join("; ")}`, details: { raw: row.contato, parse: originator } });
  } else if (originator.kind === "person" && !companyId) {
    issues.push({ code: "COMPANY_UNIDENTIFIED", severity: "INFO", message: `Originador "${originator.personName}" sem empresa identificada.`, details: { raw: row.contato } });
  } else if (originator.kind === "placeholder" && !originator.companyName) {
    issues.push({ code: "ORIGINATOR_UNCLASSIFIED", severity: "INFO", message: `Contato genérico "${row.contato}" — originador não identificado.`, details: { raw: row.contato } });
  }

  const statusId = ctx.statusIds.get(decision.key)!;
  const typeId = ctx.typeIdsBySlug.get(typeSlug) ?? null;
  const needsReview = issues.some((i) => i.severity !== "INFO");

  // ── Legacy timeline ─────────────────────────────────────────────────────
  const activities: { type: ActivityType; title: string | null; body: string | null; occurredAt: Date; metadata: Record<string, unknown> }[] = [];
  const anchor = entry.date ?? exit.date ?? null;
  if (entry.date) {
    activities.push({ type: "CREATED", title: "Oportunidade recebida", body: row.descricao ? `Descrição: ${row.descricao}` : null, occurredAt: entry.date, metadata: { source: "Pipe", legacyId: row.legacyId } });
  }
  const logEntries = parseLegacyLog(row.statusOperacao, anchor);
  logEntries.forEach((e, idx) => {
    activities.push({
      type: "LEGACY_STATUS",
      title: e.rawPrefix ? `Atualização ${e.rawPrefix.replace(/[-–:]\s*$/, "").trim()}` : "Atualização de status (histórico)",
      body: e.text,
      occurredAt: e.occurredAt ?? anchor ?? new Date(0),
      metadata: { source: "Pipe", column: "Status da Operação", index: idx, dateInferred: e.dateInferred, hasDate: !!e.occurredAt },
    });
  });
  if (row.feedback) {
    const fb = parseLegacyLog(row.feedback, exit.date ?? anchor);
    fb.forEach((e, idx) => {
      activities.push({
        type: "LEGACY_FEEDBACK",
        title: "Feedback / motivo (histórico)",
        body: e.text,
        occurredAt: e.occurredAt ?? exit.date ?? anchor ?? new Date(0),
        metadata: { source: "Pipe", column: "Feedback", index: idx, dateInferred: e.dateInferred, hasDate: !!e.occurredAt },
      });
    });
  }
  if (exit.date && (decision.key === "DECLINED" || decision.key === "CONCLUDED" || decision.key === "ON_HOLD")) {
    activities.push({
      type: decision.key === "CONCLUDED" ? "CLOSED" : decision.key === "ON_HOLD" ? "STATUS_CHANGED" : "CLOSED",
      title: decision.key === "CONCLUDED" ? "Concluída / investida" : decision.key === "ON_HOLD" ? "Colocada em On Hold" : "Declinada",
      body: `Decisão registrada na planilha: "${row.decisao}"`,
      occurredAt: exit.date,
      metadata: { source: "Pipe", column: "Decisão" },
    });
  }
  const lastActivityAt = activities.reduce<Date | null>((acc, a) => (a.occurredAt.getTime() > 0 && (!acc || a.occurredAt > acc) ? a.occurredAt : acc), null);

  const normalized = {
    name,
    entryDate: isoDay(entry.date),
    entryYear,
    exitDate: isoDay(exit.date),
    amount: amount.amount,
    status: decision.key,
    typeSlug,
    assignees: assignees.members,
    originator: { companyId, contactId, kind: originator.kind, confidence: originator.confidence },
    originatorCategory,
  };

  // ── Skip unchanged rows ────────────────────────────────────────────────
  if (existingRow && existingOpp && existingRow.notes === rawHash) {
    return { opportunityId: existingOpp.id, action: "unchanged", needsReview: existingOpp.needsReview, issues: [], statusKey: decision.key, typeSlug, entryYear, assigneeTokens: assignees.members, unmappedTokens: assignees.unmapped };
  }

  const data = {
    name,
    nameRaw,
    description: row.descricao,
    operationTypeId: typeId,
    operationTypeRaw: row.tipoOperacao,
    statusId,
    statusRaw: row.decisao,
    legacyStatusText: row.statusOperacao,
    legacyFeedback: row.feedback,
    entryDate: entry.date,
    entryDateRaw: entry.raw,
    entryYear,
    entryYearRaw: year.raw,
    exitDate: exit.date,
    exitDateRaw: exit.raw,
    amount: amount.amount,
    amountRaw: amount.raw,
    assigneesRaw: row.responsavel,
    originatorRaw: row.contato,
    originatorTypeRaw: row.tipoContato,
    originatorCategory: (originatorCategory ?? null) as CompanyCategory | null,
    closedAt: decision.key === "DECLINED" || decision.key === "CONCLUDED" ? exit.date : null,
    lastActivityAt,
    needsReview,
  };

  let opportunityId: string;
  let action: RowResult["action"];
  if (existingOpp) {
    // Record audit entries for meaningful normalized changes.
    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
    if (existingOpp.statusId !== statusId) changes.push({ field: "status", oldValue: existingOpp.status.key, newValue: decision.key });
    if ((existingOpp.amount?.toString() ?? null) !== (amount.amount?.toString() ?? null)) changes.push({ field: "amount", oldValue: existingOpp.amount?.toString() ?? null, newValue: amount.amount?.toString() ?? null });
    if (existingOpp.operationTypeId !== typeId) changes.push({ field: "operationType", oldValue: existingOpp.operationType?.slug ?? null, newValue: typeSlug });
    if (existingOpp.name !== name) changes.push({ field: "name", oldValue: existingOpp.name, newValue: name });
    await prisma.opportunity.update({ where: { id: existingOpp.id }, data });
    for (const c of changes) {
      await prisma.auditLog.create({ data: { entity: "Opportunity", entityId: existingOpp.id, opportunityId: existingOpp.id, action: "import", field: c.field, oldValue: c.oldValue, newValue: c.newValue } });
    }
    opportunityId = existingOpp.id;
    action = "updated";
  } else {
    const created = await prisma.opportunity.create({ data: { ...data, legacyId: row.legacyId } });
    await prisma.auditLog.create({ data: { entity: "Opportunity", entityId: created.id, opportunityId: created.id, action: "import", field: null, oldValue: null, newValue: `Importada da planilha (Pipe, linha ${row.sourceRow}, #${row.legacyId})` } });
    opportunityId = created.id;
    action = "created";
  }

  // Assignees (replace Pipe-sourced assignments only)
  await prisma.opportunityAssignee.deleteMany({ where: { opportunityId } });
  for (const [i, key] of assignees.members.entries()) {
    const userId = ctx.userIdsByKey.get(key);
    if (userId) await prisma.opportunityAssignee.create({ data: { opportunityId, userId, isPrimary: i === 0 } });
  }

  // Originator
  await prisma.opportunityOriginator.upsert({
    where: { opportunityId_role: { opportunityId, role: "PRIMARY" } },
    update: { companyId, contactId, rawText: row.contato, confidence: originator.confidence, migrationNotes: originator.notes.join("; ") || null, needsReview: originator.needsReview },
    create: { opportunityId, role: "PRIMARY", companyId, contactId, rawText: row.contato, confidence: originator.confidence, migrationNotes: originator.notes.join("; ") || null, needsReview: originator.needsReview },
  });

  // Legacy activities (rebuild for this row)
  await prisma.activity.deleteMany({ where: { opportunityId, isLegacy: true, sourceSheet: "Pipe" } });
  for (const a of activities) {
    await prisma.activity.create({ data: { opportunityId, type: a.type, title: a.title, body: a.body, occurredAt: a.occurredAt, isLegacy: true, sourceSheet: "Pipe", sourceRow: row.sourceRow, metadata: a.metadata as Prisma.InputJsonValue } });
    ctx.counters.activities++;
  }

  await syncIssues(ctx, "Opportunity", opportunityId, opportunityId, issues);

  await prisma.importRow.upsert({
    where: { sourceWorkbook_sheet_sourceRow: { sourceWorkbook, sheet: "Pipe", sourceRow: row.sourceRow } },
    update: { batchId: ctx.batchId, legacyId: row.legacyId, rawData: row.raw as Prisma.InputJsonValue, normalized: normalized as Prisma.InputJsonValue, opportunityId, status: action, notes: rawHash },
    create: { batchId: ctx.batchId, sourceWorkbook, sheet: "Pipe", sourceRow: row.sourceRow, legacyId: row.legacyId, rawData: row.raw as Prisma.InputJsonValue, normalized: normalized as Prisma.InputJsonValue, opportunityId, status: action, notes: rawHash },
  });

  return { opportunityId, action, needsReview, issues, statusKey: decision.key, typeSlug, entryYear, assigneeTokens: assignees.members, unmappedTokens: assignees.unmapped };
}

/** Builds a lookup of opportunities by normalized name (+ date) for auxiliary-sheet reconciliation. */
async function buildNameIndex(prisma: PrismaClient) {
  const opps = await prisma.opportunity.findMany({ where: { legacyId: { not: null } }, select: { id: true, name: true, nameRaw: true, entryDate: true, legacyId: true, originatorCategory: true, sector: true } });
  const byName = new Map<string, typeof opps>();
  for (const o of opps) {
    const key = normalizeKey(o.nameRaw ?? o.name);
    if (!key) continue;
    const arr = byName.get(key) ?? [];
    arr.push(o);
    byName.set(key, arr);
  }
  return byName;
}

function matchByNameAndDate(index: Map<string, { id: string; entryDate: Date | null; legacyId: number | null }[]>, nome: string | null, date: Date | null) {
  if (!nome) return null;
  const candidates = index.get(normalizeKey(nome));
  if (!candidates || candidates.length === 0) return null;
  if (date) {
    const sameDay = candidates.filter((c) => isoDay(c.entryDate) === isoDay(date));
    if (sameDay.length === 1) return sameDay[0];
    if (sameDay.length > 1) return sameDay[0];
  }
  if (candidates.length === 1) return candidates[0];
  return null;
}

export async function importPipeline(prisma: PrismaClient, opts: ImportOptions): Promise<ImportSummary> {
  const log = opts.log ?? (() => undefined);
  const workbook = parseWorkbook(opts.filePath);
  log(`Workbook ${workbook.fileName} (${workbook.fileHash.slice(0, 12)}): ${workbook.pipe.length} Pipe rows, ${workbook.originadores.length} originadores, ${workbook.enrichment.length} enrichment rows, ${workbook.meetings.length} meeting rows`);

  await seedReferenceData(prisma);
  const batch = await prisma.importBatch.create({ data: { sourceFile: workbook.fileName, fileHash: workbook.fileHash, userId: opts.userId ?? null } });

  const statuses = await prisma.opportunityStatus.findMany();
  const types = await prisma.operationType.findMany();
  const users = await prisma.user.findMany();
  const ctx: Ctx = {
    prisma,
    batchId: batch.id,
    workbook,
    log,
    statusIds: new Map(statuses.map((s) => [s.key, s.id])),
    typeIdsBySlug: new Map(types.map((t) => [t.slug, t.id])),
    userIdsByKey: new Map(TEAM_MEMBERS.map((m) => [m.key, users.find((u) => u.email === m.email)?.id ?? ""]).filter(([, id]) => !!id) as [string, string][]),
    companyCache: new Map(),
    contactCache: new Map(),
    known: new Map(),
    counters: { companies: 0, contacts: 0, activities: 0 },
    typeMappingCache: new Map(),
  };

  try {
    // ── 1. Originadores master list ────────────────────────────────────────
    for (const o of workbook.originadores) {
      const category = mapOriginatorCategory(o.tipo);
      ctx.known.set(normalizeKey(canonicalCompanyName(o.nome)), { name: o.nome, typeRaw: o.tipo, category });
      ctx.known.set(normalizeKey(o.nome), { name: o.nome, typeRaw: o.tipo, category });
    }
    for (const o of workbook.originadores) {
      const category = mapOriginatorCategory(o.tipo);
      const parsed = parseOriginatorCell(o.nome, { known: ctx.known, typeHint: category });
      const notes = `Aba Originadores (linha ${o.sourceRow}); Tipo: ${o.tipo ?? "—"}; casos 2024/2025/2026: ${o.casos2024 ?? 0}/${o.casos2025 ?? 0}/${o.casos2026 ?? 0}`;
      let companyId: string | null = null;
      let contactId: string | null = null;
      if (parsed.companyName) {
        const knownCompany = ctx.known.get(normalizeKey(canonicalCompanyName(parsed.companyName)))?.category ?? null;
        const companyCat = parsed.personName ? knownCompany : parsed.category ?? category;
        companyId = await resolveCompany(ctx, parsed.companyName, companyCat, { confidence: parsed.confidence, notes, needsReview: parsed.needsReview, categoryRaw: parsed.personName ? null : o.tipo });
      }
      if (parsed.personName) contactId = await resolveContact(ctx, parsed.personName, companyId, parsed.category ?? category, { confidence: parsed.confidence, notes, needsReview: parsed.needsReview });
      if (!o.tipo) {
        const entity = contactId ? "Contact" : "Company";
        const id = contactId ?? companyId;
        if (id) await syncIssues(ctx, entity, id, null, [{ code: "ORIGINATOR_CATEGORY_MISSING", severity: "INFO", message: `Originador "${o.nome}" sem tipo na aba Originadores.` }]);
      }
      await prisma.importRow.upsert({
        where: { sourceWorkbook_sheet_sourceRow: { sourceWorkbook: workbook.fileName, sheet: "Originadores", sourceRow: o.sourceRow } },
        update: { batchId: batch.id, rawData: o.raw as Prisma.InputJsonValue, normalized: { companyId, contactId, kind: parsed.kind, confidence: parsed.confidence } as Prisma.InputJsonValue, status: "master" },
        create: { batchId: batch.id, sourceWorkbook: workbook.fileName, sheet: "Originadores", sourceRow: o.sourceRow, rawData: o.raw as Prisma.InputJsonValue, normalized: { companyId, contactId, kind: parsed.kind, confidence: parsed.confidence } as Prisma.InputJsonValue, status: "master" },
      });
    }
    log(`Originadores: ${ctx.counters.companies} companies, ${ctx.counters.contacts} contacts created`);

    // ── 2. Pipe rows ───────────────────────────────────────────────────────
    const typeOccurrences = new Map<string, number>();
    for (const r of workbook.pipe) typeOccurrences.set(r.tipoOperacao ?? "", (typeOccurrences.get(r.tipoOperacao ?? "") ?? 0) + 1);

    const results: RowResult[] = [];
    let created = 0, updated = 0, unchanged = 0, errors = 0;
    const issuesByCode: Record<string, number> = {};
    const byYear: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const assigneeTokens: Record<string, number> = {};
    const unmappedAssigneeTokens: Record<string, number> = {};
    for (const [i, row] of workbook.pipe.entries()) {
      try {
        const res = await importPipeRow(ctx, row, typeOccurrences);
        results.push(res);
        if (res.action === "created") created++;
        else if (res.action === "updated") updated++;
        else unchanged++;
        for (const is of res.issues) issuesByCode[is.code] = (issuesByCode[is.code] ?? 0) + 1;
        byYear[String(res.entryYear ?? "sem ano")] = (byYear[String(res.entryYear ?? "sem ano")] ?? 0) + 1;
        byStatus[res.statusKey] = (byStatus[res.statusKey] ?? 0) + 1;
        byType[res.typeSlug] = (byType[res.typeSlug] ?? 0) + 1;
        for (const t of res.assigneeTokens) assigneeTokens[t] = (assigneeTokens[t] ?? 0) + 1;
        for (const t of res.unmappedTokens) unmappedAssigneeTokens[t] = (unmappedAssigneeTokens[t] ?? 0) + 1;
      } catch (e) {
        errors++;
        log(`Row ${row.sourceRow} (#${row.legacyId}) failed: ${(e as Error).message}`);
        await prisma.importRow.upsert({
          where: { sourceWorkbook_sheet_sourceRow: { sourceWorkbook: workbook.fileName, sheet: "Pipe", sourceRow: row.sourceRow } },
          update: { batchId: batch.id, legacyId: row.legacyId, rawData: row.raw as Prisma.InputJsonValue, status: "error", notes: (e as Error).message },
          create: { batchId: batch.id, sourceWorkbook: workbook.fileName, sheet: "Pipe", sourceRow: row.sourceRow, legacyId: row.legacyId, rawData: row.raw as Prisma.InputJsonValue, status: "error", notes: (e as Error).message },
        });
      }
      if ((i + 1) % 100 === 0) log(`  ${i + 1}/${workbook.pipe.length} Pipe rows processed`);
    }
    log(`Pipe: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`);

    // ── 3. Possible duplicates inside Pipe ─────────────────────────────────
    const index = await buildNameIndex(prisma);
    const possibleDuplicates: { name: string; legacyIds: number[] }[] = [];
    for (const [, group] of index) {
      if (group.length < 2) continue;
      possibleDuplicates.push({ name: group[0].nameRaw ?? group[0].name, legacyIds: group.map((g) => g.legacyId!).sort((a, b) => a - b) });
      for (const g of group) {
        const others = group.filter((x) => x.id !== g.id).map((x) => `#${x.legacyId}`);
        await prisma.dataQualityIssue.upsert({
          where: { code_entity_entityId: { code: "POSSIBLE_DUPLICATE", entity: "Opportunity", entityId: g.id } },
          update: { message: `Mesmo nome que ${others.join(", ")}. Verificar se é duplicidade.`, details: { legacyIds: group.map((x) => x.legacyId) } as Prisma.InputJsonValue, opportunityId: g.id },
          create: { code: "POSSIBLE_DUPLICATE", entity: "Opportunity", entityId: g.id, opportunityId: g.id, severity: "WARNING", message: `Mesmo nome que ${others.join(", ")}. Verificar se é duplicidade.`, details: { legacyIds: group.map((x) => x.legacyId) } as Prisma.InputJsonValue },
        });
      }
    }
    issuesByCode["POSSIBLE_DUPLICATE"] = possibleDuplicates.reduce((n, d) => n + d.legacyIds.length, 0);

    // ── 4. Enrichment from auxiliary sheets (never creates opportunities) ──
    const enrichment: ImportSummary["enrichment"] = [];
    const unmatchedAux: ImportSummary["unmatchedAux"] = [];
    const bySheet = new Map<string, typeof workbook.enrichment>();
    for (const e of workbook.enrichment) bySheet.set(e.sheet, [...(bySheet.get(e.sheet) ?? []), e]);
    for (const [sheet, rows] of bySheet) {
      let matched = 0, unmatched = 0, applied = 0;
      for (const e of rows) {
        const date = parseSheetDate(e.data).date;
        const opp = matchByNameAndDate(index, e.nome, date);
        let appliedHere = false;
        if (opp) {
          matched++;
          const current = await prisma.opportunity.findUnique({ where: { id: opp.id }, select: { originatorCategory: true, legacyStatusText: true, assignees: true, originatorRaw: true } });
          if (current) {
            const updates: Prisma.OpportunityUpdateInput = {};
            const cat = mapOriginatorCategory(e.categoriaDePara) ?? mapOriginatorCategory(e.tipoContato);
            if (!current.originatorCategory && cat) {
              updates.originatorCategory = cat as CompanyCategory;
              appliedHere = true;
            }
            if (sheet === "Output" && e.responsavel && current.assignees.length === 0) {
              const parsed = parseAssignees(e.responsavel);
              for (const [i, key] of parsed.members.entries()) {
                const userId = ctx.userIdsByKey.get(key);
                if (userId) {
                  await prisma.opportunityAssignee.upsert({ where: { opportunityId_userId: { opportunityId: opp.id, userId } }, update: {}, create: { opportunityId: opp.id, userId, isPrimary: i === 0 } });
                  appliedHere = true;
                }
              }
              if (parsed.members.length) {
                await prisma.auditLog.create({ data: { entity: "Opportunity", entityId: opp.id, opportunityId: opp.id, action: "import", field: "assignees", oldValue: null, newValue: `${e.responsavel} (aba Output, linha ${e.sourceRow})` } });
              }
            }
            if (sheet === "Output" && e.statusOperacao && !(current.legacyStatusText ?? "").includes(e.statusOperacao.slice(0, 40))) {
              await prisma.activity.deleteMany({ where: { opportunityId: opp.id, isLegacy: true, sourceSheet: "Output", sourceRow: e.sourceRow } });
              const entries = parseLegacyLog(e.statusOperacao, date ?? opp.entryDate);
              for (const en of entries) {
                await prisma.activity.create({ data: { opportunityId: opp.id, type: "LEGACY_STATUS", title: en.rawPrefix ? `Atualização ${en.rawPrefix.replace(/[-–:]\s*$/, "").trim()} (aba Output)` : "Atualização (aba Output)", body: en.text, occurredAt: en.occurredAt ?? date ?? opp.entryDate ?? new Date(0), isLegacy: true, sourceSheet: "Output", sourceRow: e.sourceRow, metadata: { dateInferred: en.dateInferred } } });
                ctx.counters.activities++;
              }
              appliedHere = true;
            }
            if (Object.keys(updates).length) await prisma.opportunity.update({ where: { id: opp.id }, data: updates });
          }
          if (appliedHere) applied++;
        } else {
          unmatched++;
          unmatchedAux.push({ sheet, sourceRow: e.sourceRow, nome: e.nome, data: isoDay(date) });
        }
        await prisma.importRow.upsert({
          where: { sourceWorkbook_sheet_sourceRow: { sourceWorkbook: workbook.fileName, sheet, sourceRow: e.sourceRow } },
          update: { batchId: batch.id, rawData: e.raw as Prisma.InputJsonValue, opportunityId: opp?.id ?? null, status: opp ? (appliedHere ? "enriched" : "matched") : "unmatched" },
          create: { batchId: batch.id, sourceWorkbook: workbook.fileName, sheet, sourceRow: e.sourceRow, rawData: e.raw as Prisma.InputJsonValue, opportunityId: opp?.id ?? null, status: opp ? (appliedHere ? "enriched" : "matched") : "unmatched" },
        });
      }
      enrichment.push({ sheet, rows: rows.length, matched, unmatched, applied });
      log(`Enrichment ${sheet}: ${matched} matched, ${unmatched} unmatched, ${applied} applied`);
    }

    // ── 5. Vertical meeting snapshots → timeline + sector ──────────────────
    const meetings: ImportSummary["meetings"] = [];
    const meetingSheets = new Map<string, typeof workbook.meetings>();
    for (const m of workbook.meetings) meetingSheets.set(m.sheet, [...(meetingSheets.get(m.sheet) ?? []), m]);
    for (const [sheet, rows] of meetingSheets) {
      await prisma.activity.deleteMany({ where: { isLegacy: true, sourceSheet: sheet } });
      let matched = 0, unmatched = 0;
      for (const m of rows) {
        const candidates = index.get(normalizeKey(m.nome)) ?? [];
        const eligible = candidates.filter((c) => !c.entryDate || c.entryDate <= m.meetingDate);
        const pick = (eligible.length ? eligible : candidates).sort((a, b) => (b.entryDate?.getTime() ?? 0) - (a.entryDate?.getTime() ?? 0))[0];
        if (!pick) {
          unmatched++;
          continue;
        }
        matched++;
        await prisma.activity.create({
          data: {
            opportunityId: pick.id,
            type: "MEETING_SNAPSHOT",
            title: `Reunião Vertical ${m.meetingDate.toISOString().slice(0, 10).split("-").reverse().join("/")}`,
            body: [m.status ? `Status: ${m.status}` : null, m.operacao ? `Operação: ${m.operacao}` : null, m.setor ? `Setor: ${m.setor}` : null].filter(Boolean).join("\n"),
            occurredAt: m.meetingDate,
            isLegacy: true,
            sourceSheet: sheet,
            sourceRow: m.sourceRow,
            metadata: { operacao: m.operacao, setor: m.setor, status: m.status },
          },
        });
        ctx.counters.activities++;
        if (m.setor) {
          const cur = await prisma.opportunity.findUnique({ where: { id: pick.id }, select: { sector: true, lastActivityAt: true } });
          const upd: Prisma.OpportunityUpdateInput = {};
          if (cur && !cur.sector) upd.sector = m.setor;
          if (cur && (!cur.lastActivityAt || cur.lastActivityAt < m.meetingDate)) upd.lastActivityAt = m.meetingDate;
          if (Object.keys(upd).length) await prisma.opportunity.update({ where: { id: pick.id }, data: upd });
        }
        await prisma.importRow.upsert({
          where: { sourceWorkbook_sheet_sourceRow: { sourceWorkbook: workbook.fileName, sheet, sourceRow: m.sourceRow } },
          update: { batchId: batch.id, rawData: m.raw as Prisma.InputJsonValue, opportunityId: pick.id, status: "snapshot" },
          create: { batchId: batch.id, sourceWorkbook: workbook.fileName, sheet, sourceRow: m.sourceRow, rawData: m.raw as Prisma.InputJsonValue, opportunityId: pick.id, status: "snapshot" },
        });
      }
      meetings.push({ sheet, rows: rows.length, matched, unmatched });
    }

    // ── 6. Company / contact last interaction ──────────────────────────────
    await prisma.$executeRawUnsafe(`
      UPDATE "Company" c SET "lastInteractionAt" = s.last FROM (
        SELECT oo."companyId" AS id, MAX(COALESCE(o."lastActivityAt", o."entryDate")) AS last
        FROM "OpportunityOriginator" oo JOIN "Opportunity" o ON o.id = oo."opportunityId"
        WHERE oo."companyId" IS NOT NULL GROUP BY oo."companyId") s
      WHERE c.id = s.id AND (c."lastInteractionAt" IS NULL OR c."lastInteractionAt" < s.last)`);
    await prisma.$executeRawUnsafe(`
      UPDATE "Contact" c SET "lastContactAt" = s.last FROM (
        SELECT oo."contactId" AS id, MAX(COALESCE(o."lastActivityAt", o."entryDate")) AS last
        FROM "OpportunityOriginator" oo JOIN "Opportunity" o ON o.id = oo."opportunityId"
        WHERE oo."contactId" IS NOT NULL GROUP BY oo."contactId") s
      WHERE c.id = s.id AND (c."lastContactAt" IS NULL OR c."lastContactAt" < s.last)`);

    const typeMappings = (await prisma.operationTypeMapping.findMany({ include: { operationType: true }, orderBy: { occurrences: "desc" } })).map((m) => ({
      raw: m.rawValue,
      slug: m.operationType?.slug ?? m.normalizedKey,
      confidence: m.confidence,
      needsReview: m.needsReview,
      occurrences: m.occurrences,
    }));
    const issuesTotal = await prisma.dataQualityIssue.count({ where: { resolved: false } });
    const needsReviewOpportunities = await prisma.opportunity.count({ where: { needsReview: true } });

    const summary: ImportSummary = {
      batchId: batch.id,
      fileName: workbook.fileName,
      fileHash: workbook.fileHash,
      sheets: workbook.sheetNames,
      pipeRows: workbook.pipe.length,
      created,
      updated,
      unchanged,
      errors,
      companiesCreated: ctx.counters.companies,
      contactsCreated: ctx.counters.contacts,
      activitiesCreated: ctx.counters.activities,
      enrichment,
      meetings,
      issuesByCode,
      issuesTotal,
      possibleDuplicates,
      needsReviewOpportunities,
      unmatchedAux,
      byYear,
      byStatus,
      byType,
      typeMappings,
      assigneeTokens,
      unmappedAssigneeTokens,
    };
    await prisma.importBatch.update({ where: { id: batch.id }, data: { finishedAt: new Date(), status: errors ? "partial" : "success", summary: summary as unknown as Prisma.InputJsonValue } });
    return summary;
  } catch (e) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { finishedAt: new Date(), status: "failed", summary: { error: (e as Error).message } } });
    throw e;
  }
}

export { looksLikePerson, cleanText };
