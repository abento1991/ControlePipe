"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

export interface Option {
  value: string;
  label: string;
  hint?: string;
  color?: string | null;
}

export function MultiSelect({ options, value, onChange, placeholder = "Selecionar…", className, size = "default", renderValue, searchPlaceholder = "Buscar…", emptyText = "Nenhuma opção." }: { options: Option[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; className?: string; size?: "default" | "sm"; renderValue?: (selected: Option[]) => React.ReactNode; searchPlaceholder?: string; emptyText?: string }) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.value));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} role="combobox" className={cn("justify-between font-normal min-w-[140px]", size === "sm" ? "h-8" : "h-9", className)}>
          <span className="flex items-center gap-1 truncate">
            {renderValue ? renderValue(selected) : selected.length === 0 ? <span className="text-muted-foreground">{placeholder}</span> : selected.length <= 2 ? selected.map((s) => s.label).join(", ") : `${selected.length} selecionados`}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const on = value.includes(o.value);
                return (
                  <CommandItem key={o.value} value={`${o.label} ${o.hint ?? ""}`} onSelect={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded-sm border", on ? "bg-primary text-primary-foreground border-primary" : "border-input")}>{on && <Check className="h-3 w-3" />}</span>
                    {o.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />}
                    <span className="truncate">{o.label}</span>
                    {o.hint && <span className="ml-auto text-2xs text-muted-foreground">{o.hint}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {value.length > 0 && (
          <div className="border-t p-1.5 flex justify-end">
            <Button variant="ghost" size="xs" onClick={() => onChange([])}>
              <X /> Limpar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function SelectedChips({ options, value, onRemove }: { options: Option[]; value: string[]; onRemove: (v: string) => void }) {
  const selected = options.filter((o) => value.includes(o.value));
  if (!selected.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((s) => (
        <Badge key={s.value} variant="muted" className="gap-1 pr-1">
          {s.label}
          <button onClick={() => onRemove(s.value)} className="rounded-full hover:bg-black/10">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
