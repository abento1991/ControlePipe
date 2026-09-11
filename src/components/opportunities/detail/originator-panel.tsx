"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, ExternalLink, Mail, MessageCircle, User, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { EntityCombobox, type EntityOption } from "@/components/common/entity-combobox";
import { CompanyFormDialog } from "@/components/originators/company-form-dialog";
import { ContactFormDialog } from "@/components/originators/contact-form-dialog";
import { setOpportunityOriginator } from "@/lib/actions/admin";
import { CHANNEL_LABELS } from "@/lib/queries/dashboard";
import { COMPANY_CATEGORY_LABELS } from "@/lib/normalization/originators";
import { formatDate, whatsappLink } from "@/lib/utils";
import type { OpportunityDetailDTO } from "./serialize";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{children ?? "—"}</div>
    </div>
  );
}

export function OriginatorPanel({ data: o }: { data: OpportunityDetailDTO }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState<EntityOption | null>(o.originator?.company ? { id: o.originator.company.id, label: o.originator.company.name } : null);
  const [contact, setContact] = useState<EntityOption | null>(o.originator?.contact ? { id: o.originator.contact.id, label: o.originator.contact.fullName } : null);
  const [newCompany, setNewCompany] = useState(false);
  const [newContact, setNewContact] = useState(false);
  const [pending, start] = useTransition();
  const c = o.originator?.contact;
  const wa = whatsappLink(c?.whatsapp ?? c?.phone);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-lg border bg-card shadow-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Quem trouxe a oportunidade</h3>
          {!editing ? (
            <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Corrigir vínculo
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button
                size="xs"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await setOpportunityOriginator(o.id, company?.id ?? null, contact?.id ?? null);
                    if (!res.ok) toast.error(res.error);
                    else {
                      toast.success("Originador atualizado.");
                      setEditing(false);
                      router.refresh();
                    }
                  })
                }
              >
                <Check /> Salvar
              </Button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Empresa originadora</Label>
              <EntityCombobox kind="company" value={company} onChange={setCompany} onCreate={() => setNewCompany(true)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pessoa / originador</Label>
              <EntityCombobox kind="contact" value={contact} onChange={setContact} companyId={company?.id} onCreate={() => setNewContact(true)} />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Empresa originadora
              </div>
              {o.originator?.company ? (
                <>
                  <Link href={`/companies/${o.originator.company.id}`} className="text-base font-semibold hover:underline inline-flex items-center gap-1">
                    {o.originator.company.name} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                  <div>
                    <Badge variant="muted">{COMPANY_CATEGORY_LABELS[o.originator.company.category as keyof typeof COMPANY_CATEGORY_LABELS]}</Badge>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Não identificada.</p>
              )}
            </div>
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Pessoa / originador
              </div>
              {c ? (
                <>
                  <Link href={`/originators/${c.id}`} className="text-base font-semibold hover:underline inline-flex items-center gap-1">
                    {c.fullName} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                  {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
                  <div className="text-xs space-y-0.5">
                    {c.email && <div>{c.email}</div>}
                    {(c.phone || c.whatsapp) && <div>{c.whatsapp ?? c.phone}</div>}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {c.email && (
                      <Button size="xs" variant="outline" asChild>
                        <a href={`mailto:${c.email}`}>
                          <Mail /> Enviar e-mail
                        </a>
                      </Button>
                    )}
                    {wa && (
                      <Button size="xs" variant="outline" asChild>
                        <a href={wa} target="_blank" rel="noreferrer">
                          <MessageCircle /> WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Não identificada.</p>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Tipo de originador">{o.originatorCategory ? COMPANY_CATEGORY_LABELS[o.originatorCategory as keyof typeof COMPANY_CATEGORY_LABELS] : "—"}</Field>
          <Field label="Canal de entrada">{o.entryChannel ? CHANNEL_LABELS[o.entryChannel] : "—"}</Field>
          <Field label="Data do primeiro contato">{formatDate(o.firstContactAt ?? o.entryDate)}</Field>
          {o.entryChannel === "EMAIL" && (
            <>
              <Field label="Assunto do e-mail">{o.emailSubject}</Field>
              <Field label="Remetente">{o.emailSender}</Field>
              <Field label="Data do e-mail">{formatDate(o.emailDate)}</Field>
            </>
          )}
          {o.entryChannel === "WHATSAPP" && (
            <>
              <Field label="Contato (WhatsApp)">{o.whatsappContact}</Field>
              <Field label="Número">{o.whatsappNumber}</Field>
              <Field label="Mensagem resumida">{o.whatsappSummary}</Field>
            </>
          )}
        </div>
      </div>
      <div className="rounded-lg border bg-card shadow-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Dados originais da planilha</h3>
        <Field label="Contato (célula original)">{o.originatorRaw ?? "—"}</Field>
        <Field label="Tipo de contato (célula original)">{o.originatorTypeRaw ?? "—"}</Field>
        {o.originator && (
          <>
            <Field label="Confiança da migração">{o.originator.confidence !== null && o.originator.confidence !== undefined ? `${Math.round(o.originator.confidence * 100)}%` : "—"}</Field>
            {o.originator.migrationNotes && <Field label="Notas da migração">{o.originator.migrationNotes}</Field>}
            {o.originator.needsReview && <Badge variant="warning">Precisa de revisão</Badge>}
          </>
        )}
      </div>
      <CompanyFormDialog open={newCompany} onOpenChange={setNewCompany} onSaved={(c) => setCompany({ id: c.id, label: c.name })} />
      <ContactFormDialog open={newContact} onOpenChange={setNewContact} initial={{ company }} onSaved={(c) => setContact({ id: c.id, label: c.fullName })} />
    </div>
  );
}
