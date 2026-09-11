"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityCombobox, type EntityOption } from "@/components/common/entity-combobox";
import { CATEGORY_OPTIONS, RELATIONSHIP_OPTIONS } from "@/lib/constants";
import { createContact, updateContact, type ContactInput } from "@/lib/actions/originators";
import { toDateInput } from "@/lib/utils";

export interface ContactFormValues {
  id?: string;
  firstName?: string;
  lastName?: string | null;
  company?: EntityOption | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  category?: string | null;
  notes?: string | null;
  relationship?: string;
  nextFollowUpAt?: string | Date | null;
}

export function ContactFormDialog({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: ContactFormValues; onSaved?: (c: { id: string; fullName: string; companyId: string | null }) => void }) {
  const [pending, start] = useTransition();
  const [company, setCompany] = useState<EntityOption | null>(initial?.company ?? null);
  const [category, setCategory] = useState(initial?.category ?? "none");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "NOVO");
  const isEdit = !!initial?.id;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar contato" : "Novo originador / contato"}</DialogTitle>
          <DialogDescription>Pessoa que traz a oportunidade. Normalmente pertence a uma empresa, mas pode ser um contato independente.</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const input: ContactInput = {
              firstName: String(f.get("firstName") ?? ""),
              lastName: String(f.get("lastName") ?? "") || null,
              companyId: company?.id ?? null,
              title: String(f.get("title") ?? "") || null,
              email: String(f.get("email") ?? "") || null,
              phone: String(f.get("phone") ?? "") || null,
              whatsapp: String(f.get("whatsapp") ?? "") || null,
              linkedin: String(f.get("linkedin") ?? "") || null,
              category: category === "none" ? null : (category as ContactInput["category"]),
              notes: String(f.get("notes") ?? "") || null,
              relationship: relationship as ContactInput["relationship"],
              nextFollowUpAt: String(f.get("nextFollowUpAt") ?? "") || null,
            };
            start(async () => {
              const res = isEdit ? await updateContact(initial!.id!, input) : await createContact(input);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(isEdit ? "Contato atualizado." : "Contato cadastrado.");
              onOpenChange(false);
              if (!isEdit && "fullName" in res.data) onSaved?.(res.data as { id: string; fullName: string; companyId: string | null });
              else onSaved?.({ id: initial!.id!, fullName: [input.firstName, input.lastName].filter(Boolean).join(" "), companyId: company?.id ?? null });
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input name="firstName" defaultValue={initial?.firstName ?? ""} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Sobrenome</Label>
            <Input name="lastName" defaultValue={initial?.lastName ?? ""} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Empresa</Label>
            <EntityCombobox kind="company" value={company} onChange={setCompany} placeholder="Empresa (opcional)" />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Input name="title" defaultValue={initial?.title ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Herdar da empresa</SelectItem>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input name="email" type="email" defaultValue={initial?.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input name="phone" defaultValue={initial?.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input name="whatsapp" defaultValue={initial?.whatsapp ?? ""} placeholder="+55 11 9…" />
          </div>
          <div className="space-y-1.5">
            <Label>LinkedIn</Label>
            <Input name="linkedin" defaultValue={initial?.linkedin ?? ""} placeholder="https://linkedin.com/in/…" />
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
          <div className="space-y-1.5">
            <Label>Próximo follow-up</Label>
            <Input name="nextFollowUpAt" type="date" defaultValue={toDateInput(initial?.nextFollowUpAt ?? null)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Observações</Label>
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
