import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";

const FIELD_LABELS: Record<string, string> = { status: "Status", amount: "Valor", assignees: "Responsáveis", operationType: "Tipo", operationTypeId: "Tipo", name: "Nome", nextAction: "Próxima ação", nextFollowUpAt: "Follow-up", companyId: "Empresa originadora", contactId: "Contato", closeReason: "Motivo", entryDate: "Data de entrada", description: "Descrição", entryChannel: "Canal", emailSubject: "Assunto do e-mail", sector: "Setor", economicGroup: "Grupo econômico", isDeleted: "Excluída", role: "Papel", isActive: "Ativo", password: "Senha", email: "E-mail", fullName: "Nome", category: "Categoria", mergedFrom: "Mesclada de" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; entity?: string; user?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10) || 1;
  const pageSize = 100;
  const where = {
    ...(sp.entity ? { entity: sp.entity } : {}),
    ...(sp.user ? { userId: sp.user } : {}),
    ...(sp.q ? { OR: [{ opportunity: { name: { contains: sp.q, mode: "insensitive" as const } } }, { newValue: { contains: sp.q, mode: "insensitive" as const } }, { oldValue: { contains: sp.q, mode: "insensitive" as const } }] } : {}),
  };
  const [logs, total, users] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { name: true } }, opportunity: { select: { id: true, name: true } } } }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ where: { isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (sp.entity) s.set("entity", sp.entity);
    if (sp.user) s.set("user", sp.user);
    if (sp.q) s.set("q", sp.q);
    s.set("page", String(p));
    return `/admin/audit?${s}`;
  };
  return (
    <>
      <PageHeader eyebrow="Administração" title="Auditoria" description="Toda alteração relevante (status, valor, responsáveis, originador, encerramento, reativação) registra usuário, data, campo, valor anterior e novo." />
      <form className="flex flex-wrap gap-2 mb-3 text-xs" method="get">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por oportunidade ou valor…" className="h-8 rounded-md border bg-card px-3 w-64" />
        <select name="entity" defaultValue={sp.entity ?? ""} className="h-8 rounded-md border bg-card px-2">
          <option value="">Todas as entidades</option>
          {["Opportunity", "Company", "Contact", "User", "OperationTypeMapping"].map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select name="user" defaultValue={sp.user ?? ""} className="h-8 rounded-md border bg-card px-2">
          <option value="">Todos os usuários</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button className="h-8 rounded-md border bg-card px-3 hover:bg-muted">Filtrar</button>
        <span className="ml-auto self-center text-muted-foreground tabular">{total} registros</span>
      </form>
      <div className="rounded-lg border bg-card shadow-card overflow-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 260px)" }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card text-2xs uppercase tracking-wide text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
            <tr>
              <th className="text-left px-3 py-2">Quando</th>
              <th className="text-left px-3 py-2">Usuário</th>
              <th className="text-left px-3 py-2">Entidade</th>
              <th className="text-left px-3 py-2">Ação</th>
              <th className="text-left px-3 py-2">Campo</th>
              <th className="text-left px-3 py-2">Anterior</th>
              <th className="text-left px-3 py-2">Novo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-1.5 tabular whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                <td className="px-3 py-1.5">{l.user?.name ?? <span className="text-muted-foreground">sistema</span>}</td>
                <td className="px-3 py-1.5">
                  {l.opportunity ? (
                    <Link href={`/opportunities/${l.opportunity.id}`} className="hover:underline">
                      {l.opportunity.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {l.entity} {l.entityId.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <Badge variant="muted">{l.action}</Badge>
                </td>
                <td className="px-3 py-1.5">{l.field ? FIELD_LABELS[l.field] ?? l.field : "—"}</td>
                <td className="px-3 py-1.5 text-muted-foreground max-w-[220px] truncate" title={l.oldValue ?? ""}>
                  {l.oldValue ?? "—"}
                </td>
                <td className="px-3 py-1.5 max-w-[320px] truncate" title={l.newValue ?? ""}>
                  {l.newValue ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 mt-2 text-xs">
        {page > 1 && (
          <Link href={qs(page - 1)} className="rounded border px-2 py-1 hover:bg-muted">
            Anterior
          </Link>
        )}
        <span className="tabular">
          {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        {page * pageSize < total && (
          <Link href={qs(page + 1)} className="rounded border px-2 py-1 hover:bg-muted">
            Próxima
          </Link>
        )}
      </div>
    </>
  );
}
