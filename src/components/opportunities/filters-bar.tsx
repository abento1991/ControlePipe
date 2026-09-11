"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkPlus, Filter, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useUrlState } from "@/hooks/use-url-state";
import { useReference } from "@/components/layout/reference-context";
import { MultiSelect, type Option } from "@/components/common/multi-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_OPTIONS, CHANNEL_OPTIONS, TYPE_CATEGORY_OPTIONS } from "@/lib/constants";
import { AGING_BUCKETS } from "@/lib/utils";
import { saveView, deleteView } from "@/lib/actions/saved-views";

export interface SavedViewDTO {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  isShared: boolean;
  userId: string;
  userName: string;
}

export interface FiltersBarProps {
  page: string;
  years: number[];
  companies: { id: string; name: string }[];
  views: SavedViewDTO[];
  currentUserId: string;
  /** Which filter controls to show. */
  show?: { status?: boolean; groups?: boolean; aging?: boolean; flags?: boolean; years?: boolean; dates?: boolean };
  lockedKeys?: string[];
}

export function FiltersBar({ page, years, companies, views, currentUserId, show = {}, lockedKeys = [] }: FiltersBarProps) {
  const { sp, get, getList, set, replaceAll } = useUrlState();
  const ref = useReference();
  const router = useRouter();
  const [q, setQ] = useState(get("q") ?? "");
  const [saveOpen, setSaveOpen] = useState(false);
  const [pending, start] = useTransition();
  const s = { status: true, groups: false, aging: true, flags: true, years: true, dates: true, ...show };

  useEffect(() => setQ(get("q") ?? ""), [get]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((get("q") ?? "") !== q) set({ q: q || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const typeOptions: Option[] = ref.types.map((t) => ({ value: t.id, label: t.name, color: t.color }));
  const statusOptions: Option[] = ref.statuses.map((st) => ({ value: st.key, label: st.name, color: st.color }));
  const userOptions: Option[] = ref.users.map((u) => ({ value: u.id, label: u.name, color: u.color }));
  const companyOptions: Option[] = companies.map((c) => ({ value: c.id, label: c.name }));
  const yearOptions: Option[] = years.map((y) => ({ value: String(y), label: String(y) }));
  const agingOptions: Option[] = AGING_BUCKETS.map((b) => ({ value: b, label: `${b} dias` }));

  const activeKeys = ["q", "years", "from", "to", "typeIds", "typeCategories", "statusKeys", "companyIds", "contactIds", "originatorCategories", "assigneeIds", "channels", "aging", "needsReview", "unassigned", "overdue", "noNextAction", "stale", "sector"].filter((k) => sp.get(k) && !lockedKeys.includes(k));

  function clearAll() {
    const next = new URLSearchParams();
    for (const k of lockedKeys) if (sp.get(k)) next.set(k, sp.get(k)!);
    replaceAll(next);
    setQ("");
  }

  function applyView(v: SavedViewDTO) {
    const next = new URLSearchParams();
    for (const k of lockedKeys) if (sp.get(k)) next.set(k, sp.get(k)!);
    for (const [k, val] of Object.entries(v.filters)) {
      if (val === null || val === undefined || val === "") continue;
      next.set(k, Array.isArray(val) ? val.join(",") : String(val));
    }
    replaceAll(next);
  }

  const currentFilters = Object.fromEntries(activeKeys.map((k) => [k, sp.get(k)!]));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, descrição, originador…" className="pl-8 h-9" />
          {q && (
            <button className="absolute right-2 top-2.5 text-muted-foreground" onClick={() => setQ("")}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {s.years && <MultiSelect options={yearOptions} value={getList("years")} onChange={(v) => set({ years: v })} placeholder="Ano" size="sm" className="min-w-[90px]" />}
        <MultiSelect options={typeOptions} value={getList("typeIds")} onChange={(v) => set({ typeIds: v })} placeholder="Tipo" size="sm" />
        {s.status && !lockedKeys.includes("statusKeys") && <MultiSelect options={statusOptions} value={getList("statusKeys")} onChange={(v) => set({ statusKeys: v })} placeholder="Status" size="sm" />}
        <MultiSelect options={userOptions} value={getList("assigneeIds")} onChange={(v) => set({ assigneeIds: v })} placeholder="Responsável" size="sm" />
        <MultiSelect options={companyOptions} value={getList("companyIds")} onChange={(v) => set({ companyIds: v })} placeholder="Empresa originadora" size="sm" searchPlaceholder="Buscar empresa…" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter /> Mais filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] space-y-3">
            <div className="space-y-1.5">
              <Label>Categoria do originador</Label>
              <MultiSelect options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={getList("originatorCategories")} onChange={(v) => set({ originatorCategories: v })} placeholder="Todas" size="sm" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria do tipo</Label>
              <MultiSelect options={TYPE_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={getList("typeCategories")} onChange={(v) => set({ typeCategories: v })} placeholder="Todas" size="sm" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label>Canal de entrada</Label>
              <MultiSelect options={CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={getList("channels")} onChange={(v) => set({ channels: v })} placeholder="Todos" size="sm" className="w-full" />
            </div>
            {s.aging && (
              <div className="space-y-1.5">
                <Label>Aging (dias no pipeline)</Label>
                <MultiSelect options={agingOptions} value={getList("aging")} onChange={(v) => set({ aging: v })} placeholder="Todos" size="sm" className="w-full" />
              </div>
            )}
            {s.dates && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Entrada de</Label>
                  <Input type="date" className="h-8" value={get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null })} />
                </div>
                <div className="space-y-1.5">
                  <Label>até</Label>
                  <Input type="date" className="h-8" value={get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null })} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Setor contém</Label>
              <Input className="h-8" defaultValue={get("sector") ?? ""} onBlur={(e) => set({ sector: e.target.value || null })} placeholder="Agro, Energia…" />
            </div>
            {s.flags && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                {[
                  ["overdue", "Follow-up vencido"],
                  ["noNextAction", "Sem próxima ação"],
                  ["unassigned", "Sem responsável"],
                  ["needsReview", "Precisa de revisão"],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-xs">
                    <Switch checked={get(k) === "1"} onCheckedChange={(v) => set({ [k]: v ? "1" : null })} /> {label}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-xs col-span-2">
                  <Switch checked={!!get("stale")} onCheckedChange={(v) => set({ stale: v ? "30" : null })} /> Sem atualização há 30+ dias
                </label>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {activeKeys.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X /> Limpar ({activeKeys.length})
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Bookmark /> Views
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Views salvas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!views.length && <div className="px-2 py-3 text-xs text-muted-foreground">Nenhuma view salva ainda.</div>}
              {views.map((v) => (
                <DropdownMenuItem key={v.id} onSelect={() => applyView(v)} className="group/v">
                  <span className="truncate flex-1">{v.name}</span>
                  {v.isShared && <span className="text-2xs text-muted-foreground">{v.userId === currentUserId ? "compartilhada" : v.userName.split(" ")[0]}</span>}
                  {(v.userId === currentUserId) && (
                    <button
                      className="opacity-0 group-hover/v:opacity-100 text-muted-foreground hover:text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        start(async () => {
                          const res = await deleteView(v.id);
                          if (!res.ok) toast.error(res.error);
                          else router.refresh();
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
                <BookmarkPlus /> Salvar filtros atuais…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar view</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                const res = await saveView({ name: String(f.get("name")), page, filters: currentFilters, isShared: f.get("shared") === "on" });
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("View salva.");
                  setSaveOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input name="name" required placeholder='Ex.: "Precatórios 2026", "Meu pipe"' autoFocus />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="shared" className="accent-leto-green-dark" /> Compartilhar com a equipe
            </label>
            <p className="text-2xs text-muted-foreground">{activeKeys.length ? `${activeKeys.length} filtro(s) serão salvos.` : "Nenhum filtro ativo — a view mostrará tudo."}</p>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
