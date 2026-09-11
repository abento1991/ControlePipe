import { PageHeader } from "@/components/common/page-header";
import { FiltersBar, type SavedViewDTO } from "@/components/opportunities/filters-bar";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getDashboardData, getPersonalDashboard } from "@/lib/queries/dashboard";
import { getFilterOptions } from "@/lib/queries/opportunities";
import { parseFilters, countActiveFilters, type SearchParamsLike } from "@/lib/queries/filters";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const filters = parseFilters(sp);
  const [data, personal, options, views] = await Promise.all([
    getDashboardData(filters),
    getPersonalDashboard(user.id),
    getFilterOptions(),
    prisma.savedView.findMany({ where: { page: "dashboard", OR: [{ userId: user.id }, { isShared: true }] }, orderBy: { name: "asc" }, include: { user: { select: { name: true } } } }),
  ]);
  const viewDTOs: SavedViewDTO[] = views.map((v) => ({ id: v.id, name: v.name, filters: v.filters as Record<string, unknown>, isShared: v.isShared, userId: v.userId, userName: v.user.name }));
  const periodLabel = filters.years?.length ? filters.years.join(", ") : filters.from || filters.to ? `${filters.from ?? "…"} → ${filters.to ?? "…"}` : "Todo o histórico";
  const n = countActiveFilters(filters);
  return (
    <>
      <PageHeader eyebrow="Leto Capital · Special Situations" title="Dashboard" description={sp.forbidden ? "Acesso restrito a administradores." : `Indicadores calculados diretamente do banco · ${periodLabel}${n ? ` · ${n} filtro(s) ativo(s)` : ""}`} />
      <div className="mb-4">
        <FiltersBar page="dashboard" years={options.years} companies={options.companies} views={viewDTOs} currentUserId={user.id} show={{ aging: false, flags: false }} />
      </div>
      <DashboardView data={data} personal={personal} periodLabel={periodLabel} userName={user.name} />
    </>
  );
}
