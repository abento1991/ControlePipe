import { PageHeader } from "@/components/common/page-header";
import { loadListPage, ListView } from "@/components/opportunities/opportunities-list-page";
import type { SearchParamsLike } from "@/lib/queries/filters";

export const metadata = { title: "Todas as Oportunidades" };
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const sp = await searchParams;
  const data = await loadListPage(sp, "opportunities");
  return (
    <>
      <PageHeader title="Todas as Oportunidades" description={`Histórico completo — ${data.list.total.toLocaleString("pt-BR")} registros com os filtros atuais.`} />
      <ListView data={data} page="opportunities" storageKey="leto:table:all" quickEdit defaultHidden={["updatedAt", "sector", "originatorRaw", "lastActivityAt", "nextAction", "nextFollowUpAt", "entryChannel"]} />
    </>
  );
}
