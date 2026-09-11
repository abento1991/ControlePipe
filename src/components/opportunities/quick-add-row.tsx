"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityCombobox, type EntityOption } from "@/components/common/entity-combobox";
import { MultiSelect } from "@/components/common/multi-select";
import { UserAvatar } from "@/components/common/user-avatar";
import { CompanyFormDialog } from "@/components/originators/company-form-dialog";
import { ContactFormDialog } from "@/components/originators/contact-form-dialog";
import { useReference, useCurrentUser } from "@/components/layout/reference-context";
import { createOpportunity } from "@/lib/actions/opportunities";
import { CHANNEL_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** One-line "add opportunity" bar for the active pipe: type the name, pick a few fields, press Enter. */
export function QuickAddRow() {
  const ref = useReference();
  const me = useCurrentUser();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [more, setMore] = useState(false);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("none");
  const [entryDate, setEntryDate] = useState("");
  useEffect(() => setEntryDate(new Date().toISOString().slice(0, 10)), []);
  const [company, setCompany] = useState<EntityOption | null>(null);
  const [contact, setContact] = useState<EntityOption | null>(null);
  const [assignees, setAssignees] = useState<string[]>([me.id]);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("none");
  const [emailSubject, setEmailSubject] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [newCompany, setNewCompany] = useState<string | null>(null);
  const [newContact, setNewContact] = useState<string | null>(null);

  function reset() {
    setName("");
    setTypeId("none");
    setCompany(null);
    setContact(null);
    setAmount("");
    setChannel("none");
    setEmailSubject("");
    setNextAction("");
    setFollowUp("");
    setAssignees([me.id]);
    setEntryDate(new Date().toISOString().slice(0, 10));
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Digite o nome da oportunidade.");
      return;
    }
    if (channel === "EMAIL" && !emailSubject.trim()) {
      toast.error("Informe o assunto do e-mail.");
      setMore(true);
      return;
    }
    start(async () => {
      const res = await createOpportunity({
        name: name.trim(),
        operationTypeId: typeId === "none" ? null : typeId,
        entryDate: entryDate || null,
        amount: amount || null,
        companyId: company?.id ?? null,
        contactId: contact?.id ?? null,
        entryChannel: channel === "none" ? null : (channel as "EMAIL"),
        emailSubject: emailSubject || null,
        assigneeIds: assignees,
        statusKey: "ANALYSIS",
        nextAction: nextAction || null,
        nextFollowUpAt: followUp || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`“${name.trim()}” adicionada ao pipe ativo.`);
      reset();
      router.refresh();
    });
  }

  const userOptions = ref.users.map((u) => ({ value: u.id, label: u.name, color: u.color }));

  return (
    <form onSubmit={submit} className={cn("rounded-lg border border-dashed border-leto-green/70 bg-leto-green-faint/60 p-2", pending && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <Plus className="h-4 w-4 text-leto-green-deep shrink-0 ml-1" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova oportunidade — digite o nome e pressione Enter" className="h-8 flex-1 min-w-[240px] bg-card" autoComplete="off" />
        <Select value={typeId} onValueChange={setTypeId}>
          <SelectTrigger className="h-8 w-[190px] text-xs bg-card">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Tipo (definir depois)</SelectItem>
            {ref.types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" suppressHydrationWarning value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-8 w-[140px] text-xs bg-card" />
        <div className="w-[200px]">
          <EntityCombobox kind="company" value={company} onChange={(c) => { setCompany(c); if (contact && c && contact.hint && contact.hint !== c.label) setContact(null); }} placeholder="Empresa originadora" onCreate={(q) => setNewCompany(q)} className="h-8 text-xs bg-card" />
        </div>
        <div className="w-[180px]">
          <EntityCombobox kind="contact" value={contact} onChange={setContact} companyId={company?.id ?? null} placeholder="Originador" onCreate={(q) => setNewContact(q)} className="h-8 text-xs bg-card" />
        </div>
        <MultiSelect options={userOptions} value={assignees} onChange={setAssignees} size="sm" className="bg-card" placeholder="Responsável" renderValue={(sel) => (sel.length ? <span className="flex -space-x-1.5">{sel.map((s) => <UserAvatar key={s.value} name={s.label} color={s.color} className="h-5 w-5 text-[9px]" />)}</span> : <span className="text-muted-foreground text-xs">Responsável</span>)} />
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ mm" inputMode="decimal" className="h-8 w-[90px] text-xs bg-card" />
        <Button type="button" size="sm" variant="ghost" onClick={() => setMore((m) => !m)} className="text-xs">
          {more ? <ChevronUp /> : <ChevronDown />} {more ? "menos" : "mais campos"}
        </Button>
        <Button type="submit" size="sm" variant="accent" disabled={pending}>
          <Plus /> Adicionar
        </Button>
      </div>
      {more && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pl-7">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8 w-[170px] text-xs bg-card">
              <SelectValue placeholder="Canal de entrada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Canal de entrada</SelectItem>
              {CHANNEL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {channel === "EMAIL" && <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Assunto do e-mail *" className="h-8 w-[260px] text-xs bg-card" />}
          <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Próxima ação" className="h-8 flex-1 min-w-[200px] text-xs bg-card" />
          <Input type="date" suppressHydrationWarning value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="h-8 w-[140px] text-xs bg-card" title="Data do próximo follow-up" />
          <span className="text-2xs text-muted-foreground">Entra como “Em análise”. Descrição, setor e demais campos podem ser preenchidos direto na tabela ou na página da oportunidade.</span>
        </div>
      )}
      <CompanyFormDialog key={`c-${newCompany ?? ""}`} open={newCompany !== null} onOpenChange={(o) => !o && setNewCompany(null)} initial={{ name: newCompany ?? "" }} onSaved={(c) => setCompany({ id: c.id, label: c.name })} />
      <ContactFormDialog key={`p-${newContact ?? ""}-${company?.id ?? ""}`} open={newContact !== null} onOpenChange={(o) => !o && setNewContact(null)} initial={{ firstName: (newContact ?? "").split(" ")[0] ?? "", lastName: (newContact ?? "").split(" ").slice(1).join(" ") || null, company }} onSaved={(c) => { setContact({ id: c.id, label: c.fullName, hint: company?.label ?? null }); }} />
    </form>
  );
}
