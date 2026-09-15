"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, Clock, ClipboardList, Copy, Plus, Search, Trash2 } from "lucide-react";
import { cn, formatDate, toDateInput } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiSelect } from "@/components/common/multi-select";
import { AssigneeAvatars, UserAvatar } from "@/components/common/user-avatar";
import { createAdminTask, updateAdminTask, addAdminTaskUpdate, deleteAdminTask } from "@/lib/actions/admin-tasks";
import { ADMIN_TASK_CATEGORIES, ADMIN_TASK_CATEGORY_LABELS, ADMIN_TASK_STATUSES, ADMIN_TASK_STATUS_LABELS, ADMIN_TASK_PRIORITIES, ADMIN_TASK_PRIORITY_LABELS, type AdminTaskCategoryKey, type AdminTaskStatusKey, type AdminTaskPriorityKey } from "@/lib/normalization/admin-tasks";
import type { AdminTasksData, AdminTaskDTO } from "@/lib/queries/admin-tasks";

interface Entry { id: string; body: string; date: string; isLegacy: boolean; user: string | null }
type Tab = "open" | "done" | "all";

const STATUS_COLOR = Object.fromEntries(ADMIN_TASK_STATUSES.map((s) => [s.key, s.color])) as Record<string, string>;

function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium", className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] ?? "#999" }} />
      {ADMIN_TASK_STATUS_LABELS[status as AdminTaskStatusKey] ?? status}
    </span>
  );
}

/** Two-pane administrative tasks: list on the left, the selected task with its updates on the right. */
export function AdminTasksView({ data, meId, isAdmin, initialTaskId }: { data: AdminTasksData; meId: string; isAdmin: boolean; initialTaskId: string | null }) {
  const [tab, setTab] = useState<Tab>(data.summary.open > 0 ? "open" : "all");
  const [category, setCategory] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialTaskId);
  const [creating, setCreating] = useState(false);
  // A task selected before the server list refreshed (e.g. just created) must not be replaced by the first row.
  const pendingRef = useRef<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.tasks.filter((t) => {
      if (tab === "open" && !t.open) return false;
      if (tab === "done" && t.open) return false;
      if (category !== "all" && t.category !== category) return false;
      if (assignee !== "all" && !t.assignees.some((a) => a.id === assignee)) return false;
      if (!q) return true;
      return [t.title, t.description, t.counterpart, t.lastUpdate?.body].some((v) => v?.toLowerCase().includes(q));
    });
  }, [data.tasks, tab, category, assignee, query]);

  useEffect(() => {
    if (selectedId && data.tasks.some((t) => t.id === selectedId)) {
      pendingRef.current = null;
      return;
    }
    if (pendingRef.current) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [data.tasks, filtered, selectedId]);

  const selected = data.tasks.find((t) => t.id === selectedId) ?? null;
  function select(id: string) {
    pendingRef.current = id;
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("task", id);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button variant="accent" size="sm" onClick={() => setCreating(true)}>
          <Plus /> Nova tarefa
        </Button>
        <div className="flex items-center gap-3 ml-auto">
          <span><span className="font-semibold text-foreground tabular">{data.summary.open}</span> abertas</span>
          <span><span className="font-semibold text-foreground tabular">{data.summary.done}</span> concluídas</span>
          {data.summary.overdue > 0 && <span className="text-danger"><span className="font-semibold tabular">{data.summary.overdue}</span> vencidas</span>}
          {data.summary.duplicated > 0 && <span className="text-muted-foreground"><span className="font-semibold text-foreground tabular">{data.summary.duplicated}</span> duplicadas do pipe</span>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(340px,5fr)_7fr] items-start">
        <div className="rounded-lg border bg-card shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-2">
            <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
              {(["open", "done", "all"] as Tab[]).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded px-2.5 py-1 transition-colors", tab === t ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
                  {t === "open" ? "Abertas" : t === "done" ? "Concluídas" : "Todas"} <span className="tabular text-muted-foreground ml-0.5">{t === "open" ? data.summary.open : t === "done" ? data.summary.done : data.summary.all}</span>
                </button>
              ))}
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-[170px] text-xs bg-card"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todas as categorias</SelectItem>
                {ADMIN_TASK_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-8 w-[150px] text-xs bg-card"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {data.team.map((u) => <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}{u.id === meId ? " (eu)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar" className="h-8 pl-7 text-xs" />
            </div>
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-auto scrollbar-thin">
            {!filtered.length && <EmptyState icon={ClipboardList} title="Nenhuma tarefa aqui" description={data.tasks.length ? "Nenhuma tarefa corresponde ao filtro." : "Crie a primeira com “Nova tarefa”."} className="m-3 p-8" />}
            {filtered.map((t) => <TaskRow key={t.id} t={t} selected={t.id === selectedId} onSelect={() => select(t.id)} />)}
          </div>
        </div>
        <div className="rounded-lg border bg-card shadow-card min-h-[300px]">
          {selected ? <TaskDetail key={selected.id} t={selected} team={data.team} isAdmin={isAdmin} onDeleted={() => setSelectedId(null)} /> : <EmptyState icon={ClipboardList} title="Selecione uma tarefa" description="Clique em uma tarefa à esquerda para ver os andamentos." className="m-3 p-10" />}
        </div>
      </div>

      <NewTaskDialog open={creating} onOpenChange={setCreating} team={data.team} meId={meId} onCreated={(id) => select(id)} />
    </div>
  );
}

function TaskRow({ t, selected, onSelect }: { t: AdminTaskDTO; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={cn("w-full text-left border-b last:border-0 px-3 py-2.5 transition-colors hover:bg-muted/60", selected && "bg-leto-green-faint hover:bg-leto-green-faint border-l-2 border-l-leto-green", !t.open && "opacity-75")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{t.title}</span>
            {t.overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />}
            {t.priority === "HIGH" && t.open && <Badge variant="danger" className="text-[9px] px-1 py-0">alta</Badge>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
            <StatusPill status={t.status} />
            <span>{ADMIN_TASK_CATEGORY_LABELS[t.category as AdminTaskCategoryKey]}</span>
            {t.counterpart && <span>· {t.counterpart}</span>}
            {t.source && <span className={cn("inline-flex items-center gap-0.5", t.source.removedFromPipe ? "text-muted-foreground" : "text-leto-green-deep")}><Copy className="h-2.5 w-2.5" /> {t.source.removedFromPipe ? "ex-pipe" : "do pipe"}{t.source.legacyId ? ` #${t.source.legacyId}` : ""}</span>}
          </div>
          {t.lastUpdate && (
            <div className="mt-0.5 truncate text-2xs text-muted-foreground">
              <span className="tabular mr-1">{formatDate(t.lastUpdate.date)}</span>
              {t.lastUpdate.body}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right text-2xs">
          <AssigneeAvatars users={t.assignees} size="sm" />
          {t.dueAt ? (
            <div className={cn("mt-1 flex items-center justify-end gap-1 tabular", t.overdue ? "text-danger font-semibold" : "text-muted-foreground")}><Clock className="h-3 w-3" /> {formatDate(t.dueAt)}</div>
          ) : (
            <div className="mt-1 text-muted-foreground/70">sem prazo</div>
          )}
        </div>
      </div>
    </button>
  );
}

function TaskDetail({ t, team, isAdmin, onDeleted }: { t: AdminTaskDTO; team: AdminTasksData["team"]; isAdmin: boolean; onDeleted: () => void }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [text, setText] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(t.title);
  const [description, setDescription] = useState(t.description ?? "");
  const [counterpart, setCounterpart] = useState(t.counterpart ?? "");
  const [pending, start] = useTransition();

  async function load() {
    const r = await fetch(`/api/admin-tasks/${t.id}/updates`);
    setEntries(r.ok ? (await r.json()).entries : []);
  }
  useEffect(() => {
    setEntries(null);
    fetch(`/api/admin-tasks/${t.id}/updates`).then((r) => (r.ok ? r.json() : { entries: [] })).then((d) => setEntries(d.entries)).catch(() => setEntries([]));
  }, [t.id]);

  function save(input: Parameters<typeof updateAdminTask>[1], okMsg?: string) {
    start(async () => {
      const res = await updateAdminTask(t.id, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
      if (input.status !== undefined) await load();
    });
  }
  function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addAdminTaskUpdate(t.id, text, date || null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setText("");
      await load();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col">
      <div className="border-b p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() !== t.title && title.trim().length >= 2 && save({ title: title.trim() })} className="h-9 text-base font-semibold border-transparent bg-transparent px-1 -mx-1 hover:border-input focus:border-input" />
          <div className="flex items-center gap-1 shrink-0">
            {t.source && !t.source.removedFromPipe && (
              <Link href={`/opportunities/${t.source.id}`} className="inline-flex items-center gap-0.5 text-xs text-leto-green-deep hover:underline whitespace-nowrap" title={`Duplicada do caso ${t.source.name} (${t.source.status})`}>
                caso no pipe{t.source.legacyId ? ` #${t.source.legacyId}` : ""} <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
            {t.source?.removedFromPipe && <span className="text-xs text-muted-foreground whitespace-nowrap" title={`Era o caso ${t.source.name} no pipe; removido de lá após a troca de base`}>era o caso #{t.source.legacyId ?? "?"} do pipe</span>}
            {isAdmin && (
              <Button size="icon-sm" variant="ghost" title="Excluir tarefa" disabled={pending} onClick={() => { if (confirm("Excluir esta tarefa?")) start(async () => { const r = await deleteAdminTask(t.id); if (!r.ok) toast.error(r.error); else { toast.success("Tarefa excluída."); onDeleted(); router.refresh(); } }); }}>
                <Trash2 className="text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <Field label="Status">
            <Select value={t.status} onValueChange={(v) => save({ status: v as AdminTaskStatusKey }, `Status: ${ADMIN_TASK_STATUS_LABELS[v as AdminTaskStatusKey]}`)}>
              <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{ADMIN_TASK_STATUSES.map((s) => <SelectItem key={s.key} value={s.key} className="text-xs"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={t.category} onValueChange={(v) => save({ category: v as AdminTaskCategoryKey })}>
              <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{ADMIN_TASK_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={t.priority} onValueChange={(v) => save({ priority: v as AdminTaskPriorityKey })}>
              <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{ADMIN_TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Prazo">
            <Input type="date" value={toDateInput(t.dueAt)} onChange={(e) => save({ dueAt: e.target.value || null })} className={cn("h-8 text-xs bg-card", t.overdue && "border-danger text-danger")} suppressHydrationWarning />
          </Field>
          <Field label="Responsáveis">
            <MultiSelect
              size="sm"
              options={team.map((u) => ({ value: u.id, label: u.name }))}
              value={t.assignees.map((a) => a.id)}
              onChange={(ids) => save({ assigneeIds: ids })}
              placeholder="Atribuir"
              renderValue={(sel) => <span className="flex items-center gap-1">{sel.map((s) => { const u = team.find((x) => x.id === s.value); return u ? <UserAvatar key={u.id} name={u.name} initials={u.initials} color={u.color} className="h-5 w-5 text-[9px]" /> : null; })}</span>}
            />
          </Field>
          <Field label="Contraparte / contexto">
            <Input value={counterpart} onChange={(e) => setCounterpart(e.target.value)} onBlur={() => counterpart.trim() !== (t.counterpart ?? "") && save({ counterpart: counterpart.trim() || null })} placeholder="Ex.: JGP FA, Banco do Brasil" className="h-8 text-xs bg-card" />
          </Field>
        </div>
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => description.trim() !== (t.description ?? "") && save({ description: description.trim() || null })} rows={2} className="mt-1 text-xs bg-card min-h-0" placeholder="O que precisa ser feito, contexto, links." />
        </div>
      </div>

      <form onSubmit={submitUpdate} className="border-b bg-leto-green-faint/60 p-4 space-y-2">
        <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Registrar andamento</div>
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[140px] text-xs bg-card" suppressHydrationWarning />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Ex.: Enviamos a nova versão da apresentação para o Maurício." className="text-xs bg-card min-h-0" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitUpdate(e); }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xs text-muted-foreground">⌘/Ctrl + Enter salva.</span>
          <Button type="submit" size="sm" variant="accent" disabled={pending || !text.trim()}><Plus /> Registrar</Button>
        </div>
      </form>

      <div className="p-4">
        <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Andamentos</div>
        <div className="max-h-[calc(100vh-640px)] min-h-[140px] overflow-auto scrollbar-thin -mx-1">
          {entries === null && <p className="px-1 text-xs text-muted-foreground">Carregando…</p>}
          {entries && !entries.length && <p className="px-1 text-xs text-muted-foreground">Sem andamentos registrados ainda.</p>}
          {entries?.map((en) => (
            <div key={en.id} className="px-1 py-2 border-b last:border-0 text-xs">
              <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                <span className="tabular font-medium text-foreground">{formatDate(en.date)}</span>
                {en.isLegacy && <Badge variant="muted" className="text-[9px]">Planilha</Badge>}
                {en.user && <span>{en.user.split(" ")[0]}</span>}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap leading-snug">{en.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function NewTaskDialog({ open, onOpenChange, team, meId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; team: AdminTasksData["team"]; meId: string; onCreated: (id: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AdminTaskCategoryKey>("INTERNO_OUTRO");
  const [priority, setPriority] = useState<AdminTaskPriorityKey>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([meId]);
  const [counterpart, setCounterpart] = useState("");
  const [description, setDescription] = useState("");
  function reset() { setTitle(""); setCategory("INTERNO_OUTRO"); setPriority("MEDIUM"); setDueAt(""); setAssigneeIds([meId]); setCounterpart(""); setDescription(""); }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa administrativa</DialogTitle>
          <DialogDescription>Para trabalho interno que não é um caso do pipe.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createAdminTask({ title, category, priority, dueAt: dueAt || null, assigneeIds, counterpart: counterpart || null, description: description || null });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("Tarefa criada.");
              onOpenChange(false);
              reset();
              router.refresh();
              onCreated(res.data.id);
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required placeholder="Ex.: Atualizar apresentação institucional" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as AdminTaskCategoryKey)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ADMIN_TASK_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key} className="text-xs"><span className="block">{c.label}</span><span className="block text-2xs text-muted-foreground">{c.hint}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as AdminTaskPriorityKey)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ADMIN_TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key} className="text-xs">{ADMIN_TASK_PRIORITY_LABELS[p.key]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} suppressHydrationWarning />
            </div>
            <div className="space-y-1.5">
              <Label>Responsáveis</Label>
              <MultiSelect options={team.map((u) => ({ value: u.id, label: u.name }))} value={assigneeIds} onChange={setAssigneeIds} placeholder="Atribuir" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contraparte / contexto (opcional)</Label>
            <Input value={counterpart} onChange={(e) => setCounterpart(e.target.value)} placeholder="Ex.: JGP FA, administrador do fundo" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="accent" disabled={pending || title.trim().length < 2}>Criar tarefa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
