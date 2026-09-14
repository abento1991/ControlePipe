"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Inbox, Plus, Search, UserCircle2 } from "lucide-react";
import { cn, formatDate, formatMM } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, TypeBadge } from "@/components/common/badges";
import { UserAvatar, AssigneeAvatars } from "@/components/common/user-avatar";
import { StatusCell, AssigneesCell, NextActionCell, FollowUpCell } from "@/components/opportunities/quick-edit-cells";
import { addUpdate, completeFollowUp } from "@/lib/actions/activities";
import type { MyDesk as MyDeskData, DeskCase } from "@/lib/queries/my-desk";

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

type Tab = "active" | "onhold" | "all";

/** Personal desk: the person's cases on the left, the selected case's latest movements (and a quick update box) on the right. */
export function MyDesk({ desk, meId, viewingId, initialCaseId }: { desk: MyDeskData; meId: string; viewingId: string; initialCaseId: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(desk.summary.active > 0 ? "active" : "all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialCaseId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return desk.cases.filter((c) => {
      if (tab === "active" && c.status.group !== "ACTIVE") return false;
      if (tab === "onhold" && c.status.group !== "ON_HOLD") return false;
      if (!q) return true;
      return [c.name, c.economicGroup, c.company?.name, c.operationType?.name, c.nextAction].some((v) => v?.toLowerCase().includes(q));
    });
  }, [desk.cases, tab, query]);

  // Keep a valid selection: the URL's case, else the first of the filtered list.
  useEffect(() => {
    if (selectedId && desk.cases.some((c) => c.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [desk.cases, filtered, selectedId]);

  const selected = desk.cases.find((c) => c.id === selectedId) ?? null;

  function select(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("op", id);
    window.history.replaceState(null, "", url.toString());
  }

  const counts = { active: desk.summary.active, onhold: desk.summary.onHold, all: desk.cases.length };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-leto-green-deep" />
          <span className="text-muted-foreground">Mesa de</span>
          <Select value={viewingId} onValueChange={(v) => router.push(v === meId ? "/minha-mesa" : `/minha-mesa?user=${v}`)}>
            <SelectTrigger className="h-8 w-[220px] text-xs bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {desk.team.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <UserAvatar name={u.name} initials={u.initials} color={u.color} className="h-5 w-5 text-[9px]" />
                    {u.name}
                    {u.id === meId && <span className="text-muted-foreground">(eu)</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span><span className="font-semibold text-foreground tabular">{desk.summary.active}</span> ativos</span>
          <span><span className="font-semibold text-foreground tabular">{desk.summary.onHold}</span> on hold</span>
          {desk.summary.overdue > 0 && <span className="text-danger"><span className="font-semibold tabular">{desk.summary.overdue}</span> follow-ups vencidos</span>}
          {desk.summary.stale > 0 && <span className="text-warning"><span className="font-semibold tabular">{desk.summary.stale}</span> sem andamento há +30 dias</span>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(340px,5fr)_7fr] items-start">
        {/* Left: the person's cases */}
        <div className="rounded-lg border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b p-2">
            <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
              {(["active", "onhold", "all"] as Tab[]).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded px-2.5 py-1 transition-colors", tab === t ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
                  {t === "active" ? "Ativos" : t === "onhold" ? "On hold" : "Todos"} <span className="tabular text-muted-foreground ml-0.5">{counts[t]}</span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full max-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar casos" className="h-8 pl-7 text-xs" />
            </div>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto scrollbar-thin">
            {!filtered.length && <EmptyState icon={Inbox} title="Nenhum caso aqui" description={desk.cases.length ? "Nenhum caso corresponde ao filtro." : "Atribua-se como responsável em um caso do Pipe Ativo para ele aparecer na sua mesa."} className="m-3 p-8" />}
            {filtered.map((c) => (
              <CaseRow key={c.id} c={c} selected={c.id === selectedId} onSelect={() => select(c.id)} />
            ))}
          </div>
        </div>

        {/* Right: selected case */}
        <div className="rounded-lg border bg-card shadow-card min-h-[300px]">
          {selected ? <CaseDetail key={selected.id} c={selected} /> : <EmptyState icon={Inbox} title="Selecione um caso" description="Clique em um caso à esquerda para ver os últimos andamentos." className="m-3 p-10" />}
        </div>
      </div>
    </div>
  );
}

function CaseRow({ c, selected, onSelect }: { c: DeskCase; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={cn("w-full text-left border-b last:border-0 px-3 py-2.5 transition-colors hover:bg-muted/60", selected && "bg-leto-green-faint hover:bg-leto-green-faint border-l-2 border-l-leto-green")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{c.name}</span>
            {c.overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
            <TypeBadge name={c.operationType?.name} color={c.operationType?.color} className="text-[9px]" />
            <StatusBadge name={c.status.name} color={c.status.color} group={c.status.group} className="text-[9px]" />
            {c.amount !== null && <span className="tabular">{formatMM(c.amount, { compact: true })}</span>}
          </div>
          {c.nextAction && <div className="mt-1 truncate text-xs"><span className="text-muted-foreground">→ </span>{c.nextAction}</div>}
          {c.lastUpdate && (
            <div className="mt-0.5 truncate text-2xs text-muted-foreground">
              <span className="tabular mr-1">{formatDate(c.lastUpdate.date)}</span>
              {c.lastUpdate.text || TYPE_LABEL[c.lastUpdate.type]}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right text-2xs">
          {c.nextFollowUpAt ? (
            <div className={cn("flex items-center gap-1 tabular", c.overdue ? "text-danger font-semibold" : "text-muted-foreground")}>
              <Clock className="h-3 w-3" /> {formatDate(c.nextFollowUpAt)}
            </div>
          ) : (
            <div className="text-muted-foreground/70">sem follow-up</div>
          )}
          <div className={cn("mt-1 text-muted-foreground", c.daysSinceMovement > 30 && c.status.group === "ACTIVE" && "text-warning")}>{c.daysSinceMovement === 0 ? "hoje" : `${c.daysSinceMovement}d parado`}</div>
        </div>
      </div>
    </button>
  );
}

function CaseDetail({ c }: { c: DeskCase }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [text, setText] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();

  async function load() {
    const r = await fetch(`/api/opportunities/${c.id}/updates`);
    setEntries(r.ok ? (await r.json()).entries : []);
  }
  useEffect(() => {
    setEntries(null);
    fetch(`/api/opportunities/${c.id}/updates`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setEntries(d.entries))
      .catch(() => setEntries([]));
  }, [c.id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addUpdate(c.id, text, date || null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setText("");
      await load();
      router.refresh();
    });
  }

  function complete(id: string) {
    start(async () => {
      const res = await completeFollowUp(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Follow-up concluído.");
      await load();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight">{c.name}</h2>
              <Link href={`/opportunities/${c.id}`} className="inline-flex items-center gap-0.5 text-xs text-leto-green-deep hover:underline whitespace-nowrap">
                abrir página completa <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <TypeBadge name={c.operationType?.name} color={c.operationType?.color} />
              {c.company && <span>{c.company.name}</span>}
              {!c.company && c.contact && <span>{c.contact.fullName}</span>}
              {c.economicGroup && <span>· {c.economicGroup}</span>}
              {c.entryDate && <span>· entrada {formatDate(c.entryDate)}</span>}
              {c.amount !== null && <span>· {formatMM(c.amount)}</span>}
            </div>
          </div>
          <AssigneeAvatars users={c.assignees} size="md" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
          <Field label="Status"><StatusCell id={c.id} status={c.status} /></Field>
          <Field label="Responsáveis"><AssigneesCell id={c.id} assignees={c.assignees} /></Field>
          <Field label="Próxima ação"><NextActionCell id={c.id} value={c.nextAction} /></Field>
          <Field label="Follow-up"><FollowUpCell id={c.id} value={c.nextFollowUpAt} /></Field>
        </div>
      </div>

      {c.followUps.length > 0 && (
        <div className="border-b px-4 py-3">
          <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-ups pendentes</div>
          <ul className="space-y-1">
            {c.followUps.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-xs">
                <span className={cn("tabular w-[76px] shrink-0", f.overdue ? "text-danger font-semibold" : "text-muted-foreground")}>{formatDate(f.dueAt)}</span>
                <span className="min-w-0 flex-1 truncate">{f.action}</span>
                {f.user && <span className="text-2xs text-muted-foreground">{f.user.split(" ")[0]}</span>}
                <Button size="xs" variant="ghost" disabled={pending} onClick={() => complete(f.id)} title="Marcar como concluído">
                  <CheckCircle2 className="text-leto-green-deep" /> Concluir
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="border-b bg-leto-green-faint/60 p-4 space-y-2">
        <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Registrar andamento</div>
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[140px] text-xs bg-card" suppressHydrationWarning />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Ex.: Call com o originador; enviaram DRE de 2025, vamos revisar até quinta." className="text-xs bg-card min-h-0" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e); }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xs text-muted-foreground">Vira uma linha datada no histórico (⌘/Ctrl + Enter salva).</span>
          <Button type="submit" size="sm" variant="accent" disabled={pending || !text.trim()}>
            <Plus /> Registrar
          </Button>
        </div>
      </form>

      <div className="p-4">
        <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Últimos andamentos</div>
        <div className="max-h-[calc(100vh-560px)] min-h-[160px] overflow-auto scrollbar-thin -mx-1">
          {entries === null && <p className="px-1 text-xs text-muted-foreground">Carregando histórico…</p>}
          {entries && !entries.length && <p className="px-1 text-xs text-muted-foreground">Sem andamentos registrados ainda.</p>}
          {entries?.map((en) => (
            <div key={en.id} className="px-1 py-2 border-b last:border-0 text-xs">
              <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                <span className="tabular font-medium text-foreground">{formatDate(en.date)}{en.inferred ? "*" : ""}</span>
                <Badge variant={en.isLegacy ? "muted" : "secondary"} className="text-[9px]">{TYPE_LABEL[en.type] ?? en.type}</Badge>
                {en.user && <span>{en.user.split(" ")[0]}</span>}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap leading-snug">{en.body ?? en.title}</p>
            </div>
          ))}
          {entries?.some((e) => e.inferred) && <p className="px-1 pt-2 text-[10px] text-muted-foreground">* ano inferido (a planilha só registrava dia/mês)</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background/60 px-2.5 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 min-h-[22px] flex items-center">{children}</div>
    </div>
  );
}
