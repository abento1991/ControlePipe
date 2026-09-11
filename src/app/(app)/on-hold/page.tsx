import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { loadListPage, ListView } from "@/components/opportunities/opportunities-list-page";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { SearchParamsLike } from "@/lib/queries/filters";

export const metadata = { title: "On Hold / Inativo" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "on-hold", label: "On Hold", groups: ["ON_HOLD"] as const, description: "Podem voltar para análise." },
  { key: "closed", label: "Inativas / Declinadas", groups: ["CLOSED"] as const, description: "Encerradas sem investimento." },
  { key: "concluded", label: "Concluídas", groups: ["CONCLUDED"] as const, description: "Negócios efetivamente concluídos / investidos." },
  { key: "legacy", label: "Legado", groups: ["LEGACY"] as const, description: "Registros da planilha sem decisão reconhecível." },
];

export default async function OnHoldPage({ searchParams }: { searchParams: Promise<SearchParamsLike> }) {
  const sp = await searchParams;
  const tabKey = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "on-hold";
  const tab = TABS.find((t) => t.key === tabKey)!;
  const data = await loadListPage(sp, "on-hold", { groups: [...tab.groups] });
  const counts = await prisma.opportunity.groupBy({ by: ["statusId"], where: { isDeleted: false }, _count: true });
  const statuses = await prisma.opportunityStatus.findMany({ select: { id: true, group: true } });
  const byGroup: Record<string, number> = {};
  for (const c of counts) {
    const g = statuses.find((s) => s.id === c.statusId)?.group ?? "";
    byGroup[g] = (byGroup[g] ?? 0) + c._count;
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== "tab" && k !== "page" && typeof v === "string") qs.set(k, v);
  return (
    <>
      <PageHeader title="On Hold / Inativo" description={tab.description} />
      <div className="flex flex-wrap gap-1 border-b mb-3">
        {TABS.map((t) => {
          const p = new URLSearchParams(qs);
          p.set("tab", t.key);
          return (
            <Link key={t.key} href={`/on-hold?${p.toString()}`} className={cn("px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors", t.key === tabKey ? "border-leto-green text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-2xs tabular">{t.groups.reduce((n, g) => n + (byGroup[g] ?? 0), 0)}</span>
            </Link>
          );
        })}
      </div>
      <ListView data={data} page="on-hold" storageKey={`leto:table:onhold:${tabKey}`} quickEdit={false} showReactivate lockedKeys={["groups", "tab"]} show={{ aging: false, flags: false }} defaultHidden={["legacyId", "updatedAt", "sector", "originatorRaw", "nextAction", "nextFollowUpAt", "entryChannel"]} exportBase="on-hold" />
    </>
  );
}
