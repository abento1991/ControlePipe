import { PageHeader } from "@/components/common/page-header";
import { UsersAdmin } from "@/components/admin/users-admin";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ isArchived: "asc" }, { name: "asc" }], include: { _count: { select: { assignments: true } } } });
  return (
    <>
      <PageHeader eyebrow="Special Situations · Administração" title="Usuários" description="Equipe com acesso ao Leto Pipeline. Senhas nunca ficam no código: são definidas aqui ou via `npm run users:create`." />
      <UsersAdmin currentUserId={me.id} users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, initials: u.initials, color: u.color, isActive: u.isActive, isArchived: u.isArchived, hasPassword: !!u.passwordHash, createdAt: u.createdAt.toISOString(), assignments: u._count.assignments }))} />
    </>
  );
}
