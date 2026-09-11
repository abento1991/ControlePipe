"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Link2, Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ATTACHMENT_KIND_OPTIONS, labelOf } from "@/lib/constants";
import { addAttachmentRecord, deleteAttachment } from "@/lib/actions/activities";
import { formatDate } from "@/lib/utils";
import type { OpportunityDetailDTO } from "./serialize";

export function AttachmentsPanel({ opportunityId, attachments }: { opportunityId: string; attachments: OpportunityDetailDTO["attachments"] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("TEASER");
  const [pending, start] = useTransition();
  const groups = ATTACHMENT_KIND_OPTIONS.map((k) => ({ ...k, items: attachments.filter((a) => a.kind === k.value) })).filter((g) => g.items.length);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus /> Adicionar documento
        </Button>
        <p className="text-xs text-muted-foreground">Estrutura preparada para teaser, modelo, apresentações, documentos jurídicos, proposta, NDA e outros. Nesta versão os arquivos são referenciados por link (SharePoint/Drive); upload direto pode ser habilitado depois.</p>
      </div>
      {adding && (
        <form
          className="rounded-lg border bg-card shadow-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const res = await addAttachmentRecord(opportunityId, { kind, fileName: String(f.get("fileName") ?? ""), url: String(f.get("url") ?? "") || null });
              if (!res.ok) toast.error(res.error);
              else {
                toast.success("Documento registrado.");
                setAdding(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTACHMENT_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do arquivo</Label>
            <Input name="fileName" required placeholder="Teaser_Projeto_X.pdf" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Link (opcional)</Label>
            <Input name="url" placeholder="https://…" />
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              Salvar
            </Button>
          </div>
        </form>
      )}
      {!attachments.length && <EmptyState icon={Paperclip} title="Nenhum documento" description="Registre teaser, modelo, apresentações, documentos jurídicos, proposta e NDA." />}
      {groups.map((g) => (
        <div key={g.value} className="rounded-lg border bg-card shadow-card">
          <div className="px-4 py-2 border-b text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
          <ul className="divide-y">
            {g.items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                      {a.fileName} <Link2 className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ) : (
                    <span>{a.fileName}</span>
                  )}
                  <div className="text-2xs text-muted-foreground">
                    {a.user?.name ?? "—"} · {formatDate(a.createdAt)}
                  </div>
                </div>
                <Badge variant="muted">{labelOf(ATTACHMENT_KIND_OPTIONS, a.kind)}</Badge>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteAttachment(a.id);
                      if (!res.ok) toast.error(res.error);
                      else router.refresh();
                    })
                  }
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
