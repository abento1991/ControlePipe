import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Importações" };
export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  await requireAdmin();
  const batches = await prisma.importBatch.findMany({ orderBy: { startedAt: "desc" }, take: 50, include: { _count: { select: { rows: true } }, user: { select: { name: true } } } });
  const rowStats = await prisma.importRow.groupBy({ by: ["sheet", "status"], _count: true, orderBy: { sheet: "asc" } });
  return (
    <>
      <PageHeader eyebrow="Administração" title="Importações" description="Histórico das execuções de `npm run import:pipeline`. A importação é idempotente: linhas identificadas por (arquivo, aba, linha) e oportunidades pelo # legado." />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-lg border bg-card shadow-card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Início</th>
                <th className="text-left px-3 py-2">Arquivo</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Criadas</th>
                <th className="text-right px-3 py-2">Atualizadas</th>
                <th className="text-right px-3 py-2">Inalteradas</th>
                <th className="text-right px-3 py-2">Erros</th>
                <th className="text-right px-3 py-2">Linhas</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular">
              {batches.map((b) => {
                const s = (b.summary as { created?: number; updated?: number; unchanged?: number; errors?: number } | null) ?? {};
                return (
                  <tr key={b.id}>
                    <td className="px-3 py-1.5">{formatDateTime(b.startedAt)}</td>
                    <td className="px-3 py-1.5 font-medium">
                      {b.sourceFile}
                      <div className="text-2xs text-muted-foreground font-mono">{b.fileHash?.slice(0, 12)}</div>
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant={b.status === "success" ? "success" : b.status === "failed" ? "danger" : "warning"}>{b.status}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right">{s.created ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">{s.updated ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">{s.unchanged ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">{s.errors ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">{b._count.rows}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="px-3 py-2 border-b text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Linhas importadas por aba (raw_import_data)</div>
          <table className="w-full text-xs">
            <tbody className="divide-y tabular">
              {rowStats.map((r) => (
                <tr key={`${r.sheet}-${r.status}`}>
                  <td className="px-3 py-1.5">{r.sheet}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.status}</td>
                  <td className="px-3 py-1.5 text-right">{r._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-2xs text-muted-foreground">O relatório completo de migração é gerado em <code>reports/migration-report.md</code> a cada execução.</p>
        </div>
      </div>
    </>
  );
}
