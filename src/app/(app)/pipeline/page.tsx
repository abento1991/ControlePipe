import { PageHeader } from "@/components/common/page-header";
import { loadListPage, ListView } from "@/components/opportunities/opportunities-list-page";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMM } from "@/lib/utils";
import type { SearchParamsLike } from "@/lib/queries/filters";

export const metadata = { title: "Pipe Ativo" };
export const dynamic = "force-dynamic";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const sp = await searchParams;
  const data = await loadListPage(sp, "pipeline", { groups: ["ACTIVE"] });
  const agg = await prisma.opportunity.aggregate({ where: { isDeleted: false, status: { group: "ACTIVE" } }, _count: true, _sum: { amount: true } });
  const overdue = await prisma.opportunity.count({ where: { isDeleted: false, status: { group: "ACTIVE" }, nextFollowUpAt: { lt: new Date() } } });
  return (
    <>
      <PageHeader title="Pipe Ativo" description="Clique em qualquer célula para editar (nome, tipo, data, originador, responsáveis, status, valor, próxima ação, follow-up). Use a seta ao lado do nome para abrir a página completa. Para cadastrar, use “Nova oportunidade” no topo.">
        <Button size="sm" variant="outline" asChild>
          <a href="/api/export/backup" title="Baixa um Excel completo com todas as oportunidades, histórico, empresas e contatos">
            <FileSpreadsheet /> Exportar Excel (backup)
          </a>
        </Button>
        <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
          <span>
            <span className="font-semibold text-foreground tabular">{agg._count}</span> ativas
          </span>
          <span>
            <span className="font-semibold text-foreground tabular">{formatMM(agg._sum.amount === null ? null : Number(agg._sum.amount), { compact: true })}</span> em volume informado
          </span>
          {overdue > 0 && (
            <span className="text-danger">
              <span className="font-semibold tabular">{overdue}</span> follow-ups vencidos
            </span>
          )}
        </div>
      </PageHeader>
      <ListView data={data} page="pipeline" storageKey="leto:table:pipeline" quickEdit lockedKeys={["groups"]} show={{ status: true }} exportBase="pipeline" />
    </>
  );
}
