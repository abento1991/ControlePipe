"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface EntityOption {
  id: string;
  label: string;
  hint?: string | null;
}

/** Async combobox backed by /api/lookup. Used for companies and contacts. */
export function EntityCombobox({ kind, value, onChange, placeholder, companyId, onCreate, className, disabled }: { kind: "company" | "contact"; value: EntityOption | null; onChange: (v: EntityOption | null) => void; placeholder?: string; companyId?: string | null; onCreate?: (query: string) => void; className?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ kind, q });
        if (companyId) params.set("companyId", companyId);
        const res = await fetch(`/api/lookup?${params}`, { signal: ctrl.signal });
        setItems(res.ok ? await res.json() : []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open, kind, companyId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className={cn("w-full justify-between font-normal", className)}>
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value ? value.label : placeholder ?? "Selecionar…"}</span>
          <span className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                className="rounded hover:bg-muted p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={kind === "company" ? "Buscar empresa…" : "Buscar pessoa…"} value={q} onValueChange={setQ} />
          <CommandList>
            {!loading && !items.length && <CommandEmpty>Nenhum resultado.</CommandEmpty>}
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  value={it.id}
                  onSelect={() => {
                    onChange(it);
                    setOpen(false);
                  }}
                >
                  <span className={cn("flex h-4 w-4 items-center justify-center")}>{value?.id === it.id && <Check className="h-3.5 w-3.5" />}</span>
                  <span className="truncate">{it.label}</span>
                  {it.hint && <span className="ml-auto text-2xs text-muted-foreground truncate max-w-[120px]">{it.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {onCreate && (
            <div className="border-t p-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  onCreate(q);
                }}
              >
                <Plus /> {kind === "company" ? "Cadastrar nova empresa" : "Cadastrar novo contato"}
                {q && <span className="text-muted-foreground truncate">“{q}”</span>}
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
