"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, Globe, Linkedin, Mail, MessageCircle, Pencil, Phone, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/common/kpi-card";
import { StatusBadge } from "@/components/common/badges";
import { ContactFormDialog } from "./contact-form-dialog";
import { CompanyFormDialog } from "./company-form-dialog";
import { addInteraction } from "@/lib/actions/originators";
import { CATEGORY_OPTIONS, RELATIONSHIP_OPTIONS, labelOf } from "@/lib/constants";
import { cn, daysSince, formatDate, formatDateTime, formatInt, formatMM, formatPct, whatsappLink } from "@/lib/utils";

export interface LinkedOpportunity {
  id: string;
  name: string;
  entryDate: string | null;
  amount: number | null;
  status: { name: string; group: string; color: string | null };
  operationType: { name: string } | null;
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
  contactName?: string | null;
}

export interface Interaction {
  id: string;
  type: string;
  summary: string;
  occurredAt: string;
  user: { name: string } | null;
}

const INTERACTION_TYPES = [
  { value: "NOTA", label: "Nota" },
  { value: "EMAIL", label: "E-mail" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "LIGACAO", label: "Ligação" },
  { value: "REUNIAO", label: "Reunião" },
  { value: "OUTRO", label: "Outro" },
];

export function OpportunityStats({ opps }: { opps: LinkedOpportunity[] }) {
  const active = opps.filter((o) => o.status.group === "ACTIVE").length;
  const concluded = opps.filter((o) => o.status.group === "CONCLUDED").length;
  const declined = opps.filter((o) => o.status.group === "CLOSED").length;
  const volume = opps.reduce((n, o) => n + (o.amount ?? 0), 0);
  const last = opps.map((o) => o.lastActivityAt ?? o.entryDate).filter(Boolean).sort().reverse()[0] ?? null;
  const next = opps.map((o) => o.nextFollowUpAt).filter(Boolean).sort()[0] ?? null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard label="Oportunidades trazidas" value={formatInt(opps.length)} accent="green" />
      <KpiCard label="Ativas" value={formatInt(active)} />
      <KpiCard label="Concluídas" value={formatInt(concluded)} hint={`Conversão ${formatPct(concluded + declined ? concluded / (concluded + declined) : null, 0)}`} accent="blue" />
      <KpiCard label="Volume originado" value={volume ? formatMM(volume, { compact: true }) : "—"} hint="soma dos valores informados" />
      <KpiCard label="Última interação" value={<span className="text-lg">{formatDate(last)}</span>} hint={last ? `há ${daysSince(last)} dias` : ""} />
      <KpiCard label="Próxima interação" value={<span className="text-lg">{formatDate(next)}</span>} />
    </div>
  );
}

export function OpportunityList({ opps, showContact }: { opps: LinkedOpportunity[]; showContact?: boolean }) {
  if (!opps.length) return <p className="text-sm text-muted-foreground p-4">Nenhuma oportunidade vinculada.</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-2xs uppercase tracking-wide text-muted-foreground bg-muted/50">
        <tr>
          <th className="text-left px-3 py-2">Oportunidade</th>
          <th className="text-left px-3 py-2">Tipo</th>
          {showContact && <th className="text-left px-3 py-2">Contato</th>}
          <th className="text-left px-3 py-2">Entrada</th>
          <th className="text-left px-3 py-2">Status</th>
          <th className="text-right px-3 py-2">Valor</th>
          <th className="text-left px-3 py-2">Última atividade</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {opps.map((o) => (
          <tr key={o.id} className="hover:bg-leto-green-faint">
            <td className="px-3 py-2">
              <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
                {o.name}
              </Link>
            </td>
            <td className="px-3 py-2 text-muted-foreground">{o.operationType?.name ?? "—"}</td>
            {showContact && <td className="px-3 py-2 text-muted-foreground">{o.contactName ?? "—"}</td>}
            <td className="px-3 py-2 tabular">{formatDate(o.entryDate)}</td>
            <td className="px-3 py-2">
              <StatusBadge name={o.status.name} color={o.status.color} group={o.status.group} />
            </td>
            <td className="px-3 py-2 tabular text-right">{o.amount !== null ? formatMM(o.amount) : "—"}</td>
            <td className="px-3 py-2 tabular text-muted-foreground">{formatDate(o.lastActivityAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InteractionsPanel({ contactId, companyId, interactions }: { contactId?: string | null; companyId?: string | null; interactions: Interaction[] }) {
  const router = useRouter();
  const [type, setType] = useState("NOTA");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <form
        className="rounded-lg border bg-card shadow-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const form = e.currentTarget;
          start(async () => {
            const res = await addInteraction({ contactId, companyId, type, summary: String(f.get("summary") ?? ""), occurredAt: String(f.get("occurredAt") ?? "") ? new Date(String(f.get("occurredAt"))).toISOString() : null, nextFollowUpAt: String(f.get("nextFollowUpAt") ?? "") || undefined });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Interação registrada.");
              form.reset();
              router.refresh();
            }
          });
        }}
      >
        <div className="md:col-span-4 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Registrar interação</div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERACTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data/hora</Label>
          <Input name="occurredAt" type="datetime-local" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} />
        </div>
        {contactId && (
          <div className="space-y-1.5">
            <Label>Próximo follow-up</Label>
            <Input name="nextFollowUpAt" type="date" />
          </div>
        )}
        <div className="md:col-span-4 space-y-1.5">
          <Label>Resumo</Label>
          <Textarea name="summary" rows={2} required placeholder="O que foi conversado, próximos passos…" />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            <Plus /> Registrar
          </Button>
        </div>
      </form>
      <div className="rounded-lg border bg-card shadow-card divide-y">
        {!interactions.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma interação registrada. As interações das oportunidades aparecem na timeline de cada caso.</p>}
        {interactions.map((i) => (
          <div key={i.id} className="p-3 text-xs">
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <Badge variant="muted">{INTERACTION_TYPES.find((t) => t.value === i.type)?.label ?? i.type}</Badge>
              <span className="tabular">{formatDateTime(i.occurredAt)}</span>
              {i.user && <span>· {i.user.name}</span>}
            </div>
            <p className="mt-1 whitespace-pre-wrap">{i.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ContactDetailData {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  category: string | null;
  notes: string | null;
  relationship: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  migrationConfidence: number | null;
  migrationNotes: string | null;
  needsReview: boolean;
  company: { id: string; name: string; category: string } | null;
  opportunities: LinkedOpportunity[];
  interactions: Interaction[];
}

export function ContactDetailView({ c }: { c: ContactDetailData }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const wa = whatsappLink(c.whatsapp ?? c.phone, `Olá ${c.firstName}, `);
  return (
    <div className="space-y-4">
      <Link href="/originators" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Originadores
      </Link>
      <div className="rounded-lg border bg-card shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-leto-green-light text-leto-green-deep">
              <User className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{c.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {c.title && <span>{c.title}</span>}
                {c.company && (
                  <Link href={`/companies/${c.company.id}`} className="inline-flex items-center gap-1 hover:underline">
                    <Building2 className="h-3.5 w-3.5" /> {c.company.name}
                  </Link>
                )}
                <Badge variant="muted">{labelOf(CATEGORY_OPTIONS, c.category ?? c.company?.category)}</Badge>
                <Badge variant="secondary">{labelOf(RELATIONSHIP_OPTIONS, c.relationship)}</Badge>
                {c.needsReview && <Badge variant="warning">revisar migração</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.email ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${c.email}`}>
                      <Mail /> Enviar e-mail
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <Mail /> Sem e-mail
                  </Button>
                )}
                {wa ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={wa} target="_blank" rel="noreferrer">
                      <MessageCircle /> WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <MessageCircle /> Sem WhatsApp
                  </Button>
                )}
                {c.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                      <Phone /> {c.phone}
                    </a>
                  </Button>
                )}
                {c.linkedin && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={c.linkedin} target="_blank" rel="noreferrer">
                      <Linkedin /> LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
            <Pencil /> Editar
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">E-mail</div>
            <div>{c.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Telefone / WhatsApp</div>
            <div>{c.whatsapp ?? c.phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Último contato</div>
            <div className={cn((daysSince(c.lastContactAt) ?? 0) > 120 && "text-danger")}>{c.lastContactAt ? `${formatDate(c.lastContactAt)} (há ${daysSince(c.lastContactAt)}d)` : "—"}</div>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Próximo follow-up</div>
            <div>{formatDate(c.nextFollowUpAt)}</div>
          </div>
          {c.notes && (
            <div className="col-span-2 md:col-span-4">
              <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Observações</div>
              <p className="whitespace-pre-wrap">{c.notes}</p>
            </div>
          )}
          {c.migrationNotes && (
            <div className="col-span-2 md:col-span-4 text-2xs text-muted-foreground">
              Migração: {c.migrationNotes}
              {c.migrationConfidence !== null && ` · confiança ${Math.round(c.migrationConfidence * 100)}%`}
            </div>
          )}
        </div>
      </div>
      <OpportunityStats opps={c.opportunities} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-2 border-b text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Oportunidades trazidas</div>
          <OpportunityList opps={c.opportunities} />
        </div>
        <div>
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Histórico de interações</div>
          <InteractionsPanel contactId={c.id} interactions={c.interactions} />
        </div>
      </div>
      <ContactFormDialog open={edit} onOpenChange={setEdit} initial={{ id: c.id, firstName: c.firstName, lastName: c.lastName, company: c.company ? { id: c.company.id, label: c.company.name } : null, title: c.title, email: c.email, phone: c.phone, whatsapp: c.whatsapp, linkedin: c.linkedin, category: c.category, notes: c.notes, relationship: c.relationship, nextFollowUpAt: c.nextFollowUpAt }} onSaved={() => router.refresh()} />
    </div>
  );
}

export interface CompanyDetailData {
  id: string;
  name: string;
  shortName: string | null;
  category: string;
  categoryRaw: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  relationship: string;
  lastInteractionAt: string | null;
  migrationConfidence: number | null;
  migrationNotes: string | null;
  needsReview: boolean;
  aliases: string[];
  contacts: { id: string; fullName: string; title: string | null; email: string | null; phone: string | null; whatsapp: string | null }[];
  opportunities: LinkedOpportunity[];
  interactions: Interaction[];
}

export function CompanyDetailView({ c }: { c: CompanyDetailData }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [newContact, setNewContact] = useState(false);
  return (
    <div className="space-y-4">
      <Link href="/companies" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Empresas
      </Link>
      <div className="rounded-lg border bg-card shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-leto-ink text-leto-green">
              <Building2 className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {c.shortName && <span>{c.shortName}</span>}
                <Badge variant="muted">{labelOf(CATEGORY_OPTIONS, c.category)}</Badge>
                <Badge variant="secondary">{labelOf(RELATIONSHIP_OPTIONS, c.relationship)}</Badge>
                {c.website && (
                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    <Globe className="h-3.5 w-3.5" /> {c.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {c.needsReview && <Badge variant="warning">revisar migração</Badge>}
              </div>
              {c.aliases.length > 0 && <div className="mt-1 text-2xs text-muted-foreground">Também aparece como: {c.aliases.join(", ")}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setNewContact(true)}>
              <Plus /> Contato
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              <Pencil /> Editar
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Última interação</div>
            <div className={cn((daysSince(c.lastInteractionAt) ?? 0) > 120 && "text-danger")}>{c.lastInteractionAt ? `${formatDate(c.lastInteractionAt)} (há ${daysSince(c.lastInteractionAt)}d)` : "—"}</div>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Endereço</div>
            <div>{c.address ?? "—"}</div>
          </div>
          <div className="col-span-2">
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Notas</div>
            <p className="whitespace-pre-wrap">{c.notes ?? "—"}</p>
          </div>
          {(c.migrationNotes || c.categoryRaw) && (
            <div className="col-span-2 md:col-span-4 text-2xs text-muted-foreground">
              {c.categoryRaw && <span>Tipo na planilha: “{c.categoryRaw}” · </span>}
              {c.migrationNotes && <span>Migração: {c.migrationNotes}</span>}
            </div>
          )}
        </div>
      </div>
      <OpportunityStats opps={c.opportunities} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card shadow-card overflow-hidden">
            <div className="px-4 py-2 border-b text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Contatos / originadores ({c.contacts.length})</div>
            {!c.contacts.length && <p className="p-4 text-sm text-muted-foreground">Nenhum contato cadastrado nesta empresa.</p>}
            <ul className="divide-y">
              {c.contacts.map((p) => {
                const wa = whatsappLink(p.whatsapp ?? p.phone);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/originators/${p.id}`} className="font-medium hover:underline">
                      {p.fullName}
                    </Link>
                    {p.title && <span className="text-xs text-muted-foreground">{p.title}</span>}
                    <div className="ml-auto flex gap-1">
                      {p.email && (
                        <Button size="icon-sm" variant="ghost" asChild>
                          <a href={`mailto:${p.email}`}>
                            <Mail />
                          </a>
                        </Button>
                      )}
                      {wa && (
                        <Button size="icon-sm" variant="ghost" asChild>
                          <a href={wa} target="_blank" rel="noreferrer">
                            <MessageCircle />
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-lg border bg-card shadow-card overflow-hidden">
            <div className="px-4 py-2 border-b text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Oportunidades originadas</div>
            <OpportunityList opps={c.opportunities} showContact />
          </div>
        </div>
        <div>
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Histórico de interações</div>
          <InteractionsPanel companyId={c.id} interactions={c.interactions} />
        </div>
      </div>
      <CompanyFormDialog open={edit} onOpenChange={setEdit} initial={{ id: c.id, name: c.name, shortName: c.shortName, category: c.category, website: c.website, address: c.address, notes: c.notes, relationship: c.relationship }} onSaved={() => router.refresh()} />
      <ContactFormDialog open={newContact} onOpenChange={setNewContact} initial={{ company: { id: c.id, label: c.name } }} onSaved={() => router.refresh()} />
    </div>
  );
}
