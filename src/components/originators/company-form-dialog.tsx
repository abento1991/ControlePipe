"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_OPTIONS, RELATIONSHIP_OPTIONS } from "@/lib/constants";
import { createCompany, updateCompany, type CompanyInput } from "@/lib/actions/originators";

export interface CompanyFormValues {
  id?: string;
  name: string;
  shortName?: string | null;
  category: string;
  website?: string | null;
  address?: string | null;
  notes?: string | null;
  relationship?: string;
}

export function CompanyFormDialog({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Partial<CompanyFormValues>; onSaved?: (c: { id: string; name: string; category: string }) => void }) {
  const [pending, start] = useTransition();
  const [category, setCategory] = useState(initial?.category ?? "OUTROS");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "NOVO");
  const isEdit = !!initial?.id;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar empresa" : "Nova empresa originadora"}</DialogTitle>
          <DialogDescription>Bancos, assets, consultorias, boutiques, brokers e escritórios que trazem oportunidades.</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const input: CompanyInput = {
              name: String(f.get("name") ?? ""),
              shortName: String(f.get("shortName") ?? "") || null,
              category: category as CompanyInput["category"],
              website: String(f.get("website") ?? "") || null,
              address: String(f.get("address") ?? "") || null,
              notes: String(f.get("notes") ?? "") || null,
              relationship: relationship as CompanyInput["relationship"],
            };
            start(async () => {
              const res = isEdit ? await updateCompany(initial!.id!, input) : await createCompany(input);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(isEdit ? "Empresa atualizada." : "Empresa cadastrada.");
              onOpenChange(false);
              if (!isEdit && "name" in res.data) onSaved?.(res.data as { id: string; name: string; category: string });
              else onSaved?.({ id: initial!.id!, name: input.name, category: input.category ?? "OUTROS" });
            });
          }}
        >
          <div className="col-span-2 space-y-1.5">
            <Label>Nome *</Label>
            <Input name="name" defaultValue={initial?.name ?? ""} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nome curto</Label>
            <Input name="shortName" defaultValue={initial?.shortName ?? ""} placeholder="A&M, BB…" />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input name="website" defaultValue={initial?.website ?? ""} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>Relacionamento</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Endereço (opcional)</Label>
            <Input name="address" defaultValue={initial?.address ?? ""} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notas</Label>
            <Textarea name="notes" defaultValue={initial?.notes ?? ""} rows={3} />
          </div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
