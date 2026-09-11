import { PageHeader } from "@/components/common/page-header";
import { TypeMappingsAdmin } from "@/components/admin/type-mappings-admin";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Tipos de operação" };
export const dynamic = "force-dynamic";

export default async function OperationTypesPage() {
  await requireAdmin();
  const [mappings, types] = await Promise.all([
    prisma.operationTypeMapping.findMany({ orderBy: [{ needsReview: "desc" }, { occurrences: "desc" }, { rawValue: "asc" }] }),
    prisma.operationType.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { opportunities: true } } } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Special Situations · Administração" title="Tipos de operação — de/para" description="Cada grafia encontrada na planilha (operation_type_raw) aponta para um tipo normalizado. Alterar o de/para reclassifica todas as oportunidades com aquele valor original; o valor original nunca é alterado." />
      <TypeMappingsAdmin mappings={mappings.map((m) => ({ id: m.id, rawValue: m.rawValue, operationTypeId: m.operationTypeId, confidence: m.confidence, source: m.source, occurrences: m.occurrences, needsReview: m.needsReview }))} types={types.map((t) => ({ id: t.id, name: t.name, slug: t.slug, category: t.category, color: t.color, description: t.description, isActive: t.isActive, count: t._count.opportunities }))} />
    </>
  );
}
