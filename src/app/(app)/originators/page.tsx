import { PageHeader } from "@/components/common/page-header";
import { CrmTable } from "@/components/originators/crm-table";
import { CrmSummary } from "@/components/originators/crm-summary";
import { listContactsCrm } from "@/lib/queries/originators";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Originadores" };
export const dynamic = "force-dynamic";

export default async function OriginatorsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const year = parseInt(sp.year ?? "", 10) || new Date().getFullYear();
  const rows = await listContactsCrm(year);
  return (
    <>
      <PageHeader title="Originadores" description="CRM de pessoas que trazem oportunidades: quem origina, quem converte, quem precisa de follow-up e quais relacionamentos estão esfriando." />
      <CrmSummary rows={rows} year={year} kind="contact" />
      <CrmTable rows={rows} kind="contact" year={year} storageKey="leto:table:originators" />
    </>
  );
}
