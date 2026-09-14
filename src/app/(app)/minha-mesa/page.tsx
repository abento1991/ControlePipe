import { PageHeader } from "@/components/common/page-header";
import { MyDesk } from "@/components/my-desk/my-desk";
import { requireUser } from "@/lib/session";
import { getMyDesk } from "@/lib/queries/my-desk";

export const metadata = { title: "Minha mesa" };
export const dynamic = "force-dynamic";

export default async function MyDeskPage({ searchParams }: { searchParams: Promise<{ user?: string; op?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const userId = sp.user || me.id;
  const desk = await getMyDesk(userId);
  const ownerName = desk.owner?.name ?? me.name;
  const isMe = userId === me.id;
  return (
    <>
      <PageHeader
        title={isMe ? "Minha mesa" : `Mesa de ${ownerName.split(" ")[0]}`}
        description={isMe ? "Os casos sob sua responsabilidade, com o andamento do caso selecionado ao lado. Follow-ups vencidos aparecem primeiro." : `Casos sob responsabilidade de ${ownerName}. Você pode registrar andamentos em nome da equipe.`}
      />
      <MyDesk desk={desk} meId={me.id} viewingId={userId} initialCaseId={sp.op ?? null} />
    </>
  );
}
