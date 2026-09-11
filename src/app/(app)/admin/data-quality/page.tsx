import { PageHeader } from "@/components/common/page-header";
import { DataQualityAdmin } from "@/components/admin/data-quality-admin";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Data Quality" };
export const dynamic = "force-dynamic";

export default async function DataQualityPage({ searchParams }: { searchParams: Promise<{ code?: string; resolved?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const showResolved = sp.resolved === "1";
  const where = { ...(sp.code ? { code: sp.code } : {}), ...(showResolved ? {} : { resolved: false }) };
  const [issues, grouped, total] = await Promise.all([
    prisma.dataQualityIssue.findMany({ where, orderBy: [{ severity: "desc" }, { createdAt: "asc" }], take: 500, include: { opportunity: { select: { id: true, name: true, legacyId: true } } } }),
    prisma.dataQualityIssue.groupBy({ by: ["code", "severity"], where: { resolved: false }, _count: true }),
    prisma.dataQualityIssue.count({ where: { resolved: false } }),
  ]);
  const order = { ERROR: 0, WARNING: 1, INFO: 2 };
  const merged = new Map<string, { code: string; severity: "INFO" | "WARNING" | "ERROR"; count: number }>();
  for (const g of grouped) {
    const cur = merged.get(g.code);
    if (!cur) merged.set(g.code, { code: g.code, severity: g.severity, count: g._count });
    else {
      cur.count += g._count;
      if (order[g.severity] < order[cur.severity]) cur.severity = g.severity;
    }
  }
  const counts = [...merged.values()].sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
  return (
    <>
      <PageHeader eyebrow="Administração" title="Data Quality" description="Problemas detectados na importação: nomes/datas ausentes, anos inconsistentes, originadores não classificados, tipos e responsáveis não normalizados, duplicidades. Corrija na oportunidade (Editar / Corrigir vínculo) ou no de/para de tipos, depois marque como resolvido." />
      <DataQualityAdmin issues={issues.map((i) => ({ id: i.id, code: i.code, severity: i.severity, entity: i.entity, entityId: i.entityId, message: i.message, resolved: i.resolved, resolvedAt: i.resolvedAt?.toISOString() ?? null, resolutionNote: i.resolutionNote, createdAt: i.createdAt.toISOString(), opportunity: i.opportunity, details: (i.details as Record<string, unknown> | null) ?? null }))} counts={counts} code={sp.code ?? null} showResolved={showResolved} total={total} />
    </>
  );
}
