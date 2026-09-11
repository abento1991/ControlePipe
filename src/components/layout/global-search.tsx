"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Layers, Building2, User, UserCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { SearchResult } from "@/lib/queries/search";

const ICONS = { opportunity: Layers, company: Building2, contact: User, user: UserCircle };
const LABELS = { opportunity: "Oportunidades", company: "Empresas", contact: "Originadores", user: "Responsáveis" };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setResults(res.ok ? await res.json() : []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const groups = (["opportunity", "company", "contact", "user"] as const).map((t) => ({ type: t, items: results.filter((r) => r.type === t) })).filter((g) => g.items.length);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 h-9 w-full max-w-md rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm hover:bg-muted/60 transition-colors">
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left truncate">Buscar oportunidade, empresa, originador, responsável…</span>
        <kbd className="hidden md:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden" hideClose>
          <DialogTitle className="sr-only">Busca global</DialogTitle>
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar em oportunidades, empresas, originadores, descrições e comentários…" value={q} onValueChange={setQ} autoFocus />
            <CommandList>
              {q.trim().length >= 2 && !loading && !results.length && <CommandEmpty>Nenhum resultado.</CommandEmpty>}
              {q.trim().length < 2 && <div className="py-6 text-center text-xs text-muted-foreground">Digite ao menos 2 caracteres. Dica: o número da planilha (#) também funciona.</div>}
              {groups.map((g) => (
                <CommandGroup key={g.type} heading={LABELS[g.type]}>
                  {g.items.map((r) => {
                    const Icon = ICONS[r.type];
                    return (
                      <CommandItem
                        key={`${r.type}-${r.id}`}
                        value={`${r.type}-${r.id}`}
                        onSelect={() => {
                          setOpen(false);
                          setQ("");
                          router.push(r.href);
                        }}
                      >
                        <Icon className="text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate">{r.title}</div>
                          {r.subtitle && <div className="text-2xs text-muted-foreground truncate">{r.subtitle}</div>}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
