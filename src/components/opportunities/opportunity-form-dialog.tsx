"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/common/multi-select";
import { EntityCombobox, type EntityOption } from "@/components/common/entity-combobox";
import { UserAvatar } from "@/components/common/user-avatar";
import { CompanyFormDialog } from "@/components/originators/company-form-dialog";
import { ContactFormDialog } from "@/components/originators/contact-form-dialog";
import { useReference, useCurrentUser } from "@/components/layout/reference-context";
import { CHANNEL_OPTIONS } from "@/lib/constants";
import { createOpportunity, updateOpportunity, type OpportunityInput } from "@/lib/actions/opportunities";
import { toDateInput } from "@/lib/utils";

export interface OpportunityFormValues {
  id?: string;
  name?: string;
  economicGroup?: string | null;
  operationTypeId?: string | null;
  entryDate?: string | Date | null;
  amount?: number | string | null;
  company?: EntityOption | null;
  contact?: EntityOption | null;
  entryChannel?: string | null;
  emailSubject?: string | null;
  emailSender?: string | null;
  emailDate?: string | Date | null;
  whatsappContact?: string | null;
  whatsappNumber?: string | null;
  whatsappSummary?: string | null;
  firstContactAt?: string | Date | null;
  description?: string | null;
  sector?: string | null;
  assigneeIds?: string[];
  statusKey?: string;
  nextAction?: string | null;
  nextFollowUpAt?: string | Date | null;
}

const GROUP_LABELS: Record<string, string> = { ACTIVE: "Ativo", ON_HOLD: "On Hold", CONCLUDED: "Concluído", CLOSED: "Encerrado", LEGACY: "Legado" };

export function OpportunityFormDialog({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: OpportunityFormValues; onSaved?: (id: string) => void }) {
  const ref = useReference();
  const me = useCurrentUser();
  const router = useRouter();
  const [pending, start] = useTransition();
  const isEdit = !!initial?.id;

  const [typeId, setTypeId] = useState(initial?.operationTypeId ?? "none");
  const [statusKey, setStatusKey] = useState(initial?.statusKey ?? "NEW");
  const [channel, setChannel] = useState(initial?.entryChannel ?? "none");
  const [assignees, setAssignees] = useState<string[]>(initial?.assigneeIds ?? (isEdit ? [] : [me.id]));
  const [company, setCompany] = useState<EntityOption | null>(initial?.company ?? null);
  const [contact, setContact] = useState<EntityOption | null>(initial?.contact ?? null);
  const [newCompany, setNewCompany] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [newContact, setNewContact] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) {
      setTypeId(initial?.operationTypeId ?? "none");
      setStatusKey(initial?.statusKey ?? "NEW");
      setChannel(initial?.entryChannel ?? "none");
      setAssignees(initial?.assigneeIds ?? (isEdit ? [] : [me.id]));
      setCompany(initial?.company ?? null);
      setContact(initial?.contact ?? null);
      setErrors({});
    }
  }, [open, initial, isEdit, me.id]);

  const userOptions = ref.users.map((u) => ({ value: u.id, label: u.name, color: u.color }));
  const groupedStatuses = ["ACTIVE", "ON_HOLD", "CONCLUDED", "CLOSED"].map((g) => ({ g, items: ref.statuses.filter((s) => s.group === g) }));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const input: OpportunityInput = {
      name: v("name"),
      economicGroup: v("economicGroup") || null,
      operationTypeId: typeId === "none" ? null : typeId,
      entryDate: v("entryDate") || null,
      amount: v("amount") || null,
      companyId: company?.id ?? null,
      contactId: contact?.id ?? null,
      entryChannel: channel === "none" ? null : (channel as OpportunityInput["entryChannel"]),
      emailSubject: v("emailSubject") || null,
      emailSender: v("emailSender") || null,
      emailDate: v("emailDate") || null,
      whatsappContact: v("whatsappContact") || null,
      whatsappNumber: v("whatsappNumber") || null,
      whatsappSummary: v("whatsappSummary") || null,
      firstContactAt: v("firstContactAt") || null,
      description: v("description") || null,
      sector: v("sector") || null,
      assigneeIds: assignees,
      statusKey,
      nextAction: v("nextAction") || null,
      nextFollowUpAt: v("nextFollowUpAt") || null,
    };
    start(async () => {
      const res = isEdit ? await updateOpportunity(initial!.id!, input) : await createOpportunity(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Oportunidade atualizada." : "Oportunidade criada.");
      onOpenChange(false);
      if (onSaved) onSaved(res.data.id);
      else if (!isEdit) router.push(`/opportunities/${res.data.id}`);
      router.refresh();
    });
  }

  const err = (k: string) => (errors[k]?.length ? <p className="text-2xs text-danger">{errors[k][0]}</p> : null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
            <DialogDescription>{isEdit ? "Alterações são registradas na auditoria e na timeline." : "Registre a oportunidade recebida. Você pode cadastrar a empresa e o contato originador sem sair daqui."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <section className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-4 space-y-1.5">
                <Label>Nome da oportunidade *</Label>
                <Input name="name" defaultValue={initial?.name ?? ""} required autoFocus placeholder="Ex.: Precatório Estado do Paraná — Família X" />
                {err("name")}
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Empresa / grupo econômico</Label>
                <Input name="economicGroup" defaultValue={initial?.economicGroup ?? ""} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Tipo da operação</Label>
                <Select value={typeId} onValueChange={setTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {ref.types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Data de entrada</Label>
                <Input name="entryDate" type="date" defaultValue={toDateInput(initial?.entryDate ?? null) || (isEdit ? "" : new Date().toISOString().slice(0, 10))} />
              </div>
              <div className="md:col-span-1 space-y-1.5">
                <Label>Valor (R$ mm)</Label>
                <Input name="amount" inputMode="decimal" defaultValue={initial?.amount ?? ""} placeholder="0,0" />
              </div>
              <div className="md:col-span-1 space-y-1.5">
                <Label>Setor</Label>
                <Input name="sector" defaultValue={initial?.sector ?? ""} />
              </div>
            </section>

            <section className="rounded-md border bg-muted/30 p-3 grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-6 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Originação</div>
              <div className="md:col-span-3 space-y-1.5">
                <Label>Empresa originadora</Label>
                <EntityCombobox
                  kind="company"
                  value={company}
                  onChange={(c) => {
                    setCompany(c);
                    if (contact && c && contact.hint && contact.hint !== c.label) setContact(null);
                  }}
                  placeholder="Buscar empresa…"
                  onCreate={(q) => setNewCompany({ open: true, name: q })}
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label>Contato / originador</Label>
                <EntityCombobox kind="contact" value={contact} onChange={setContact} companyId={company?.id ?? null} placeholder={company ? `Pessoa em ${company.label}…` : "Buscar pessoa…"} onCreate={(q) => setNewContact({ open: true, name: q })} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Canal de entrada</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {CHANNEL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Data do primeiro contato</Label>
                <Input name="firstContactAt" type="date" defaultValue={toDateInput(initial?.firstContactAt ?? null)} />
              </div>
              {channel === "EMAIL" && (
                <>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Data do e-mail</Label>
                    <Input name="emailDate" type="date" defaultValue={toDateInput(initial?.emailDate ?? null)} />
                  </div>
                  <div className="md:col-span-4 space-y-1.5">
                    <Label>Assunto do e-mail *</Label>
                    <Input name="emailSubject" defaultValue={initial?.emailSubject ?? ""} required placeholder="Assunto exatamente como recebido" />
                    {err("emailSubject")}
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Remetente</Label>
                    <Input name="emailSender" defaultValue={initial?.emailSender ?? ""} placeholder="nome@empresa.com" />
                  </div>
                </>
              )}
              {channel === "WHATSAPP" && (
                <>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Contato (WhatsApp)</Label>
                    <Input name="whatsappContact" defaultValue={initial?.whatsappContact ?? ""} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Número</Label>
                    <Input name="whatsappNumber" defaultValue={initial?.whatsappNumber ?? ""} placeholder="+55 11 9…" />
                  </div>
                  <div className="md:col-span-6 space-y-1.5">
                    <Label>Mensagem resumida</Label>
                    <Textarea name="whatsappSummary" defaultValue={initial?.whatsappSummary ?? ""} rows={2} />
                  </div>
                </>
              )}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-6 space-y-1.5">
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={initial?.description ?? ""} rows={3} placeholder="Resumo da oportunidade, tese, garantias, contexto…" />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label>Responsáveis pela análise</Label>
                <MultiSelect
                  options={userOptions}
                  value={assignees}
                  onChange={setAssignees}
                  placeholder="Selecionar responsáveis"
                  className="w-full"
                  renderValue={(sel) =>
                    sel.length ? (
                      <span className="flex items-center gap-1.5">
                        <span className="flex -space-x-1.5">
                          {sel.map((s) => (
                            <UserAvatar key={s.value} name={s.label} color={s.color} className="h-5 w-5 text-[9px]" />
                          ))}
                        </span>
                        <span className="truncate">{sel.map((s) => s.label.split(" ")[0]).join(", ")}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Selecionar responsáveis</span>
                    )
                  }
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label>{isEdit ? "Status" : "Status inicial"}</Label>
                <Select value={statusKey} onValueChange={setStatusKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedStatuses.map((g) => (
                      <SelectGroup key={g.g}>
                        <SelectLabel>{GROUP_LABELS[g.g]}</SelectLabel>
                        {g.items.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    {isEdit && initial?.statusKey === "LEGACY_UNCLASSIFIED" && <SelectItem value="LEGACY_UNCLASSIFIED">Legado / não classificado</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <Label>Próxima ação</Label>
                <Input name="nextAction" defaultValue={initial?.nextAction ?? ""} placeholder="Ex.: cobrar modelo financeiro" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Próximo follow-up</Label>
                <Input name="nextFollowUpAt" type="date" defaultValue={toDateInput(initial?.nextFollowUpAt ?? null)} />
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {isEdit ? "Salvar alterações" : "Criar oportunidade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CompanyFormDialog key={`c-${newCompany.name}`} open={newCompany.open} onOpenChange={(o) => setNewCompany((s) => ({ ...s, open: o }))} initial={{ name: newCompany.name }} onSaved={(c) => setCompany({ id: c.id, label: c.name, hint: c.category })} />
      <ContactFormDialog key={`p-${newContact.name}-${company?.id ?? ""}`} open={newContact.open} onOpenChange={(o) => setNewContact((s) => ({ ...s, open: o }))} initial={{ firstName: newContact.name.split(" ")[0] ?? "", lastName: newContact.name.split(" ").slice(1).join(" ") || null, company }} onSaved={(c) => setContact({ id: c.id, label: c.fullName, hint: company?.label ?? null })} />
    </>
  );
}
