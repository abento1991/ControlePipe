"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUrlState } from "@/hooks/use-url-state";
import { resolveIssue, reopenIssue } from "@/lib/actions/admin";
import { ISSUE_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export interface IssueRow {
  id: string;
  code: string;
  severity: "INFO" | "WARNING" | "ERROR";
  entity: string;
  entityId: string;
  message: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  opportunity: { id: string; name: string; legacyId: number | null } | null;
  details: Record<string, unknown> | null;
}

export function DataQualityAdmin({ issues, counts, code, showResolved, total }: { issues: IssueRow[]; counts: { code: string; severity: string; count: number }[]; code: string | null; showResolved: boolean; total: number }) {
  const router = useRouter();
  const { set } = useUrlState();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<Record<string, string>>({});
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <div className="space-y-1">
        <button onClick={() => set({ code: null })} className={cn("w-full flex items-center justify-between rounded-md px-3 py-2 text-xs hover:bg-muted", !code && "bg-muted font-semibold")}>
          <span>Todos os problemas</span>
          <span className="tabular">{total}</span>
        </button>
        {counts.map((c) => (
          <button key={c.code} onClick={() => set({ code: c.code })} className={cn("w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs hover:bg-muted", code === c.code && "bg-muted font-semibold")}>
            <span className="flex items-center gap-2 min-w-0">
              <span className={cn("h-2 w-2 rounded-full shrink-0", c.severity === "ERROR" ? "bg-danger" : c.severity === "WARNING" ? "bg-warning" : "bg-info")} />
              <span className="truncate">{ISSUE_LABELS[c.code] ?? c.code}</span>
            </span>
            <span className="tabular">{c.count}</span>
          </button>
        ))}
        <label className="flex items-center gap-2 px-3 pt-3 text-xs text-muted-foreground">
          <Switch checked={showResolved} onCheckedChange={(v) => set({ resolved: v ? "1" : null })} /> Mostrar resolvidos
        </label>
      </div>
      <div className="xl:col-span-3 rounded-lg border bg-card shadow-card divide-y overflow-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {!issues.length && <p className="p-6 text-sm text-muted-foreground">Nenhum problema nesta categoria.</p>}
        {issues.map((i) => (
          <div key={i.id} className={cn("p-3 text-xs flex flex-wrap items-start gap-3", i.resolved && "opacity-60")}>
            <Badge variant={i.severity === "ERROR" ? "danger" : i.severity === "WARNING" ? "warning" : "info"} className="mt-0.5">
              {ISSUE_LABELS[i.code] ?? i.code}
            </Badge>
            <div className="flex-1 min-w-[240px]">
              {i.opportunity ? (
                <Link href={`/opportunities/${i.opportunity.id}`} className="font-medium hover:underline inline-flex items-center gap-1">
                  {i.opportunity.name} {i.opportunity.legacyId && <span className="text-muted-foreground">#{i.opportunity.legacyId}</span>} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              ) : (
                <Link href={i.entity === "Contact" ? `/originators/${i.entityId}` : `/companies/${i.entityId}`} className="font-medium hover:underline inline-flex items-center gap-1">
                  {i.entity} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              )}
              <div className="text-muted-foreground mt-0.5">{i.message}</div>
              {i.resolved && (
                <div className="text-2xs text-muted-foreground mt-0.5">
                  Resolvido em {formatDate(i.resolvedAt)}
                  {i.resolutionNote ? ` — ${i.resolutionNote}` : ""}
                </div>
              )}
            </div>
            {!i.resolved ? (
              <div className="flex items-center gap-1.5">
                <Input placeholder="Nota (opcional)" className="h-7 w-44 text-xs" value={note[i.id] ?? ""} onChange={(e) => setNote((n) => ({ ...n, [i.id]: e.target.value }))} />
                <Button
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await resolveIssue(i.id, note[i.id]);
                      if (!res.ok) toast.error(res.error);
                      else router.refresh();
                    })
                  }
                >
                  <Check /> Resolver
                </Button>
              </div>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await reopenIssue(i.id);
                    if (!res.ok) toast.error(res.error);
                    else router.refresh();
                  })
                }
              >
                <RotateCcw /> Reabrir
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
