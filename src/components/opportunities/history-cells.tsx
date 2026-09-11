"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History, MessageSquareText, Plus } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addUpdate } from "@/lib/actions/activities";
import { quickUpdateOpportunity } from "@/lib/actions/opportunities";

interface Entry {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  date: string;
  isLegacy: boolean;
  inferred: boolean;
  user: string | null;
}

const TYPE_LABEL: Record<string, string> = { NOTE: "Atualização", EMAIL: "E-mail", WHATSAPP: "WhatsApp", MEETING: "Reunião", CALL: "Ligação", INFO_RECEIVED: "Informação", PROPOSAL_SENT: "Proposta", STATUS_CHANGED: "Status", REACTIVATED: "Reativação", CLOSED: "Encerramento", FOLLOW_UP: "Follow-up", LEGACY_STATUS: "Planilha", LEGACY_FEEDBACK: "Feedback", MEETING_SNAPSHOT: "Reunião vertical", CREATED: "Criada" };

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "Status da operação" column: latest dated update, full log on click, quick "dd/mm - texto" entry. */
export function HistoryCell({ id, lastUpdate, count }: { id: string; lastUpdate: { date: string; text: string; type: string; isLegacy: boolean } | null; count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDate(new Date().toISOString().slice(0, 10));
    fetch(`/api/opportunities/${id}/updates`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setEntries(d.entries))
      .catch(() => setEntries([]));
  }, [open, id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addUpdate(id, text, date || null);
      if (!res.ok) toast.error(res.error);
      else {
        setText("");
        setEntries(null);
        const r = await fetch(`/api/opportunities/${id}/updates`);
        if (r.ok) setEntries((await r.json()).entries);
        router.refresh();
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("group/h w-full text-left rounded px-1 -mx-1 hover:bg-muted text-xs leading-snug", pending && "opacity-50")} title="Ver histórico e registrar atualização">
          {lastUpdate ? (
            <span className="block truncate">
              <span className="tabular text-muted-foreground mr-1">{shortDate(lastUpdate.date)}</span>
              {lastUpdate.text || TYPE_LABEL[lastUpdate.type] || ""}
            </span>
          ) : (
            <span className="italic text-muted-foreground">registrar atualização</span>
          )}
          {count > 1 && <span className="text-2xs text-muted-foreground">+{count - 1} anteriores</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[460px] p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="p-3 border-b bg-leto-green-faint/60 space-y-2">
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Nova atualização</div>
          <div className="flex gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-[130px] text-xs bg-card" />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Ex.: Enviamos proposta indicativa; aguardando retorno até sexta." className="text-xs bg-card min-h-0" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xs text-muted-foreground">Vira uma linha datada no histórico (⌘/Ctrl + Enter salva).</span>
            <Button type="submit" size="xs" disabled={pending || !text.trim()}>
              <Plus /> Registrar
            </Button>
          </div>
        </form>
        <div className="max-h-[360px] overflow-auto scrollbar-thin">
          {entries === null && <p className="p-3 text-xs text-muted-foreground">Carregando histórico…</p>}
          {entries && !entries.length && <p className="p-3 text-xs text-muted-foreground">Sem atualizações registradas.</p>}
          {entries?.map((en) => (
            <div key={en.id} className="px-3 py-2 border-b last:border-0 text-xs">
              <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                <span className="tabular font-medium text-foreground">{formatDate(en.date)}{en.inferred ? "*" : ""}</span>
                <Badge variant={en.isLegacy ? "muted" : "secondary"} className="text-[9px]">{TYPE_LABEL[en.type] ?? en.type}</Badge>
                {en.user && <span>{en.user.split(" ")[0]}</span>}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap leading-snug">{en.body ?? en.title}</p>
            </div>
          ))}
        </div>
        {entries?.some((e) => e.inferred) && <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t">* ano inferido (a planilha só registrava dia/mês)</p>}
      </PopoverContent>
    </Popover>
  );
}

/** "Motivo / feedback" column: editable reason (declines, on hold) with the original sheet feedback kept as reference. */
export function FeedbackCell({ id, closeReason, legacyFeedback }: { id: string; closeReason: string | null; legacyFeedback: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(closeReason ?? "");
  const [pending, start] = useTransition();
  const shown = closeReason ?? legacyFeedback;
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(closeReason ?? ""); }}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={cn("w-full text-left rounded px-1 -mx-1 hover:bg-muted text-xs leading-snug truncate block", !shown && "italic text-muted-foreground", pending && "opacity-50")} title={shown ?? "Registrar motivo / feedback"}>
          {shown ?? "motivo / feedback"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px]" align="start" onClick={(e) => e.stopPropagation()}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await quickUpdateOpportunity(id, { closeReason: text || null });
              if (!res.ok) toast.error(res.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MessageSquareText className="h-3 w-3" /> Motivo da negativa / feedback</div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="text-xs" placeholder="Ex.: Garantias insuficientes; TIR abaixo do mínimo do fundo." />
          {legacyFeedback && (
            <div className="rounded border bg-muted/40 p-2 text-2xs">
              <div className="font-semibold text-muted-foreground mb-0.5 flex items-center gap-1"><History className="h-3 w-3" /> Feedback original da planilha</div>
              <p className="whitespace-pre-wrap">{legacyFeedback}</p>
            </div>
          )}
          <div className="flex justify-end gap-1">
            <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" size="xs" disabled={pending}>Salvar</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
