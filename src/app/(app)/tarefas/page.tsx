import { PageHeader } from "@/components/common/page-header";
import { AdminTasksView } from "@/components/admin-tasks/admin-tasks-view";
import { requireUser } from "@/lib/session";
import { getAdminTasks } from "@/lib/queries/admin-tasks";

export const metadata = { title: "Tarefas administrativas" };
export const dynamic = "force-dynamic";

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const data = await getAdminTasks({ scope: "all" });
  return (
    <>
      <PageHeader title="Tarefas administrativas" description="Trabalho interno que não é um caso do pipe: apresentações, relacionamento com originadores, fundos e estrutura, fornecedores, marketing. Tarefas vencidas aparecem primeiro." />
      <AdminTasksView data={data} meId={me.id} isAdmin={me.role === "ADMIN"} initialTaskId={sp.task ?? null} />
    </>
  );
}
