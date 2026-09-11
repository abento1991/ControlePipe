import { PageHeader } from "@/components/common/page-header";
import { FiltersBar, type SavedViewDTO } from "@/components/opportunities/filters-bar";
import { ReportsView } from "@/components/reports/reports-view";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getFilterOptions } from "@/lib/queries/opportunities";
import { parseFilters, type SearchParamsLike } from "@/lib/queries/filters";
import { runReport, DIMENSION_LABELS, type ReportDimension } from "@/lib/queries/reports";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const filters = parseFilters(sp);
  const dim = (typeof sp.dim === "string" && sp.dim in DIMENSION_LABELS ? sp.dim : "month") as ReportDimension;
  const [result, options, views] = await Promise.all([
    runReport(dim, filters),
    getFilterOptions(),
    prisma.savedView.findMany({ where: { page: "reports", OR: [{ userId: user.id }, { isShared: true }] }, orderBy: { name: "asc" }, include: { user: { select: { name: true } } } }),
  ]);
  const viewDTOs: SavedViewDTO[] = views.map((v) => ({ id: v.id, name: v.name, filters: v.filters as Record<string, unknown>, isShared: v.isShared, userId: v.userId, userName: v.user.name }));
  return (
    <>
      <PageHeader title="Relatórios" description="Responda perguntas de originação combinando qualquer filtro. Exporte tabelas (CSV/Excel) e gráficos (PNG/SVG, Presentation Mode) para apresentações." />
      <div className="mb-4">
        <FiltersBar page="reports" years={options.years} companies={options.companies} views={viewDTOs} currentUserId={user.id} show={{ aging: false, flags: false }} lockedKeys={["dim", "metric", "sortBy"]} />
      </div>
      <ReportsView result={result} metric={typeof sp.metric === "string" ? sp.metric : "received"} sortBy={typeof sp.sortBy === "string" ? sp.sortBy : ""} />
    </>
  );
}
