"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/common/user-avatar";
import { addNote } from "@/lib/actions/activities";
import { formatDateTime } from "@/lib/utils";
import type { OpportunityDetailDTO } from "./serialize";

export function NotesPanel({ opportunityId, notes }: { opportunityId: string; notes: OpportunityDetailDTO["notes"] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        <form
          className="rounded-lg border bg-card shadow-card p-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await addNote(opportunityId, body);
              if (!res.ok) toast.error(res.error);
              else {
                setBody("");
                toast.success("Nota adicionada.");
                router.refresh();
              }
            });
          }}
        >
          <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Nova nota de análise</div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Informações relevantes da análise: garantias, estrutura, riscos, precificação, próximos passos…" />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>
              Adicionar nota
            </Button>
          </div>
        </form>
        {!notes.length && <p className="text-sm text-muted-foreground px-1">Nenhuma nota ainda. Os textos históricos da planilha estão na aba Histórico.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border bg-card shadow-card p-4">
            <div className="flex items-center gap-2 text-2xs text-muted-foreground mb-2">
              {n.user && <UserAvatar name={n.user.name} initials={n.user.initials} color={n.user.color} className="h-5 w-5 text-[9px]" />}
              <span className="font-medium text-foreground">{n.user?.name ?? "—"}</span>
              <span>·</span>
              <span className="tabular">{formatDateTime(n.createdAt)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.body}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Como usar</p>
        <p>Use as notas para registrar a análise da oportunidade (tese, garantias, precificação, riscos). Cada nota tem autor e data e também aparece na timeline.</p>
        <p>Para registrar contatos (e-mail, WhatsApp, reunião, ligação, proposta enviada), use “Registrar atividade” na aba Histórico.</p>
      </div>
    </div>
  );
}
