"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TypeBadge } from "@/components/common/badges";
import { TYPE_CATEGORY_OPTIONS, labelOf } from "@/lib/constants";
import { createOperationType, updateTypeMapping, updateOperationType } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export interface MappingRow {
  id: string;
  rawValue: string;
  operationTypeId: string | null;
  confidence: number;
  source: string;
  occurrences: number;
  needsReview: boolean;
}
export interface TypeRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string | null;
  description: string | null;
  isActive: boolean;
  count: number;
}

export function TypeMappingsAdmin({ mappings, types }: { mappings: MappingRow[]; types: TypeRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState("all");
  const [pending, start] = useTransition();
  const [newType, setNewType] = useState(false);
  const [editType, setEditType] = useState<TypeRow | null>(null);
  const [category, setCategory] = useState("OUTROS");

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return mappings.filter((m) => (!k || m.rawValue.toLowerCase().includes(k)) && (only === "all" || (only === "review" && m.needsReview) || (only === "manual" && m.source === "manual")));
  }, [mappings, q, only]);

  function setMapping(m: MappingRow, typeId: string) {
    start(async () => {
      const res = await updateTypeMapping(m.id, typeId === "none" ? null : typeId, true);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`De/para atualizado — ${res.data.updated} oportunidades reclassificadas.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar valor original…" className="pl-8 h-8" />
          </div>
          <ToggleGroup type="single" value={only} onValueChange={(v) => v && setOnly(v)}>
            <ToggleGroupItem value="all">Todos ({mappings.length})</ToggleGroupItem>
            <ToggleGroupItem value="review">Revisar ({mappings.filter((m) => m.needsReview).length})</ToggleGroupItem>
            <ToggleGroupItem value="manual">Manuais ({mappings.filter((m) => m.source === "manual").length})</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="rounded-lg border bg-card shadow-card overflow-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 260px)" }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card text-2xs uppercase tracking-wide text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
              <tr>
                <th className="text-left px-3 py-2">Valor original (planilha)</th>
                <th className="text-right px-3 py-2">Ocorr.</th>
                <th className="text-left px-3 py-2">Tipo normalizado</th>
                <th className="text-right px-3 py-2">Confiança</th>
                <th className="text-left px-3 py-2">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((m) => (
                <tr key={m.id} className={cn(m.needsReview && "bg-warning/5")}>
                  <td className="px-3 py-1.5 font-medium">
                    {m.rawValue}
                    {m.needsReview && (
                      <Badge variant="warning" className="ml-2">
                        revisar
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular">{m.occurrences}</td>
                  <td className="px-3 py-1.5">
                    <Select value={m.operationTypeId ?? "none"} onValueChange={(v) => setMapping(m, v)} disabled={pending}>
                      <SelectTrigger className="h-7 w-[280px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— sem tipo —</SelectItem>
                        {types.filter((t) => t.isActive).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular">{Math.round(m.confidence * 100)}%</td>
                  <td className="px-3 py-1.5">
                    <Badge variant={m.source === "manual" ? "accent" : "muted"}>{m.source === "manual" ? "manual" : "regra"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tipos normalizados</h3>
          <Button size="sm" variant="outline" onClick={() => { setCategory("OUTROS"); setNewType(true); }}>
            <Plus /> Novo tipo
          </Button>
        </div>
        <div className="rounded-lg border bg-card shadow-card divide-y">
          {types.map((t) => (
            <button key={t.id} onClick={() => { setCategory(t.category); setEditType(t); }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted", !t.isActive && "opacity-50")}>
              <TypeBadge name={t.name} color={t.color} />
              <span className="text-muted-foreground truncate">{labelOf(TYPE_CATEGORY_OPTIONS, t.category)}</span>
              <span className="ml-auto tabular text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={newType || !!editType} onOpenChange={(o) => { if (!o) { setNewType(false); setEditType(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editType ? "Editar tipo" : "Novo tipo de operação"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const input = { name: String(f.get("name")), category, color: String(f.get("color") ?? "") || null, description: String(f.get("description") ?? "") || null, isActive: f.get("isActive") === "on" };
              start(async () => {
                const res = editType ? await updateOperationType(editType.id, input) : await createOperationType(input);
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("Tipo salvo.");
                  setNewType(false);
                  setEditType(null);
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input name="name" defaultValue={editType?.name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <Input name="color" type="color" defaultValue={editType?.color ?? "#587f28"} className="h-9 p-1" />
              </div>
              {editType && (
                <label className="flex items-center gap-2 text-xs pt-5">
                  <input type="checkbox" name="isActive" defaultChecked={editType.isActive} /> Ativo
                </label>
              )}
              {!editType && <input type="hidden" name="isActive" value="on" />}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input name="description" defaultValue={editType?.description ?? ""} />
            </div>
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
