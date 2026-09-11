import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { listOpportunities, getFilterOptions } from "@/lib/queries/opportunities";
import { parseFilters, type OpportunityFilters, type SearchParamsLike } from "@/lib/queries/filters";
import { FiltersBar, type SavedViewDTO } from "./filters-bar";
import { OpportunityTable } from "./opportunity-table";

export async function loadListPage(sp: SearchParamsLike, page: string, baseFilters: Partial<OpportunityFilters> = {}) {
  const user = await requireUser();
  const filters = { ...parseFilters(sp), ...baseFilters };
  const pageNum = parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1;
  const pageSize = parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "50", 10) || 50;
  const sort = { id: typeof sp.sort === "string" ? sp.sort : "entryDate", desc: (typeof sp.dir === "string" ? sp.dir : "desc") === "desc" };
  const [list, options, views] = await Promise.all([
    listOpportunities({ filters, sort, page: pageNum, pageSize }),
    getFilterOptions(),
    prisma.savedView.findMany({ where: { page, OR: [{ userId: user.id }, { isShared: true }] }, orderBy: { name: "asc" }, include: { user: { select: { name: true } } } }),
  ]);
  const viewDTOs: SavedViewDTO[] = views.map((v) => ({ id: v.id, name: v.name, filters: v.filters as Record<string, unknown>, isShared: v.isShared, userId: v.userId, userName: v.user.name }));
  return { user, filters, list, options, views: viewDTOs };
}

export function ListView({ data, page, storageKey, quickEdit, showReactivate, lockedKeys, show, defaultHidden, exportBase, summary }: { data: Awaited<ReturnType<typeof loadListPage>>; page: string; storageKey: string; quickEdit?: boolean; showReactivate?: boolean; lockedKeys?: string[]; show?: Parameters<typeof FiltersBar>[0]["show"]; defaultHidden?: string[]; exportBase?: string; summary?: React.ReactNode }) {
  const { list, options, views, user } = data;
  return (
    <div className="space-y-3">
      <FiltersBar page={page} years={options.years} companies={options.companies} views={views} currentUserId={user.id} lockedKeys={lockedKeys} show={show} />
      {summary}
      <OpportunityTable rows={list.rows} total={list.total} page={list.page} pageSize={list.pageSize} storageKey={storageKey} quickEdit={quickEdit} showReactivate={showReactivate} defaultHidden={defaultHidden} exportBase={exportBase} />
    </div>
  );
}
