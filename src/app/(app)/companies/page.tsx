import { PageHeader } from "@/components/common/page-header";
import { CrmTable } from "@/components/originators/crm-table";
import { CrmSummary } from "@/components/originators/crm-summary";
import { listCompaniesCrm } from "@/lib/queries/originators";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Empresas" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const year = parseInt(sp.year ?? "", 10) || new Date().getFullYear();
  const rows = await listCompaniesCrm(year);
  return (
    <>
      <PageHeader title="Empresas originadoras" description="Bancos, assets, consultorias, boutiques, brokers e escritórios que originam oportunidades para a Leto." />
      <CrmSummary rows={rows} year={year} kind="company" />
      <CrmTable rows={rows} kind="company" year={year} storageKey="leto:table:companies" />
    </>
  );
}
