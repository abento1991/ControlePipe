"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone, Users, FileText, Send, Inbox, Sparkles, RefreshCw, UserCog, XCircle, CalendarCheck, History, ClipboardList, Import, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/common/user-avatar";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/constants";
import { addActivity, completeFollowUp } from "@/lib/actions/activities";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { OpportunityDetailDTO } from "./serialize";

const META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  CREATED: { label: "Criada", icon: Sparkles, tone: "bg-leto-green text-leto-ink" },
  NOTE: { label: "Nota", icon: FileText, tone: "bg-muted text-foreground" },
  EMAIL: { label: "E-mail", icon: Mail, tone: "bg-info/15 text-info" },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle, tone: "bg-success/15 text-success" },
  MEETING: { label: "Reunião", icon: Users, tone: "bg-secondary text-secondary-foreground" },
  CALL: { label: "Ligação", icon: Phone, tone: "bg-info/15 text-info" },
  INFO_RECEIVED: { label: "Informação recebida", icon: Inbox, tone: "bg-muted text-foreground" },
  PROPOSAL_SENT: { label: "Proposta enviada", icon: Send, tone: "bg-leto-green-deep text-white" },
  STATUS_CHANGED: { label: "Status alterado", icon: RefreshCw, tone: "bg-warning/20 text-[#7a5a17]" },
  ASSIGNEE_CHANGED: { label: "Responsável alterado", icon: UserCog, tone: "bg-muted text-foreground" },
  REACTIVATED: { label: "Reativação", icon: RefreshCw, tone: "bg-leto-green text-leto-ink" },
  CLOSED: { label: "Encerramento", icon: XCircle, tone: "bg-danger/15 text-danger" },
  FOLLOW_UP: { label: "Follow-up", icon: CalendarCheck, tone: "bg-muted text-foreground" },
  LEGACY_STATUS: { label: "Histórico (planilha)", icon: History, tone: "bg-[#efe9d8] text-[#6b5a2e]" },
  LEGACY_FEEDBACK: { label: "Feedback (planilha)", icon: ClipboardList, tone: "bg-[#efe9d8] text-[#6b5a2e]" },
  MEETING_SNAPSHOT: { label: "Reunião Vertical (planilha)", icon: Users, tone: "bg-[#efe9d8] text-[#6b5a2e]" },
  IMPORTED: { label: "Importado", icon: Import, tone: "bg-muted text-foreground" },
};

type Activity = OpportunityDetailDTO["activities"][number];

export function Timeline({ opportunityId, activities, followUps }: { opportunityId: string; activities: Activity[]; followUps: OpportunityDetailDTO["followUps"] }) {
  const router = useRouter();
  const [showLegacy, setShowLegacy] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("NOTE");
  const [pending, start] = useTransition();

  const filtered = activities.filter((a) => (showLegacy || !a.isLegacy) && (typeFilter === "all" || a.type === typeFilter));
  const openFollowUps = followUps.filter((f) => !f.completedAt);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus /> Registrar atividade
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={showLegacy} onCheckedChange={setShowLegacy} /> Histórico da planilha
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {adding && (
          <form
            className="rounded-lg border bg-card shadow-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const v = (k: string) => String(f.get(k) ?? "").trim();
              start(async () => {
                const res = await addActivity(opportunityId, { type: type as "NOTE", title: v("title") || null, body: v("body") || null, occurredAt: v("occurredAt") ? new Date(v("occurredAt")).toISOString() : null, nextAction: v("nextAction") || undefined, nextFollowUpAt: v("nextFollowUpAt") || undefined });
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("Atividade registrada.");
                  setAdding(false);
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Título</Label>
              <Input name="title" placeholder="Ex.: Call com o originador" />
            </div>
            <div className="space-y-1.5">
              <Label>Data/hora</Label>
              <Input name="occurredAt" type="datetime-local" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <Label>Descrição</Label>
              <Textarea name="body" rows={3} placeholder="O que aconteceu, o que foi combinado…" />
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <Label>Próxima ação (atualiza a oportunidade)</Label>
              <Input name="nextAction" placeholder="Ex.: enviar proposta indicativa" />
            </div>
            <div className="space-y-1.5">
              <Label>Próximo follow-up</Label>
              <Input name="nextFollowUpAt" type="date" />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                Salvar
              </Button>
            </div>
          </form>
        )}

        <ol className="relative border-l ml-3 space-y-0">
          {!filtered.length && <li className="pl-6 py-6 text-sm text-muted-foreground">Nenhuma atividade.</li>}
          {filtered.map((a) => {
            const m = META[a.type] ?? META.NOTE;
            const Icon = m.icon;
            const inferred = a.metadata?.dateInferred === true;
            const noDate = a.metadata?.hasDate === false;
            return (
              <li key={a.id} className="relative pl-7 pb-5 group">
                <span className={cn("absolute -left-[13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", m.tone)}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-semibold">{a.title ?? m.label}</span>
                  <span className="text-2xs text-muted-foreground tabular" title={inferred ? "Ano inferido a partir da data de entrada (a planilha registrava apenas dia/mês)" : undefined}>
                    {noDate ? "sem data" : a.type === "LEGACY_STATUS" || a.type === "LEGACY_FEEDBACK" || a.type === "MEETING_SNAPSHOT" || a.type === "CREATED" ? formatDate(a.occurredAt) : formatDateTime(a.occurredAt)}
                    {inferred && "*"}
                  </span>
                  {a.isLegacy && (
                    <Badge variant="muted" className="text-[9px]">
                      {a.sourceSheet ?? "planilha"}
                    </Badge>
                  )}
                  {a.user && (
                    <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                      <UserAvatar name={a.user.name} initials={a.user.initials} color={a.user.color} className="h-4 w-4 text-[8px]" /> {a.user.name.split(" ")[0]}
                    </span>
                  )}
                </div>
                {a.body && <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{a.body}</p>}
              </li>
            );
          })}
        </ol>
        {filtered.some((a) => a.metadata?.dateInferred) && <p className="text-2xs text-muted-foreground">* ano inferido: a planilha registrava apenas dia/mês; o ano foi deduzido a partir da data de entrada.</p>}
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border bg-card shadow-card p-4">
          <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Follow-ups pendentes</div>
          {!openFollowUps.length && <p className="text-xs text-muted-foreground">Nenhum follow-up pendente.</p>}
          <ul className="space-y-2">
            {openFollowUps.map((f) => {
              const overdue = new Date(f.dueAt) < new Date(new Date().toDateString());
              return (
                <li key={f.id} className="flex items-start gap-2 text-xs">
                  <span className={cn("tabular w-16 shrink-0", overdue && "text-danger font-semibold")}>{formatDate(f.dueAt)}</span>
                  <span className="flex-1">{f.action}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await completeFollowUp(f.id);
                        if (!res.ok) toast.error(res.error);
                        else router.refresh();
                      })
                    }
                  >
                    <CalendarCheck /> Concluir
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-lg border bg-card shadow-card p-4">
          <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Legenda</div>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(META).map(([k, m]) => {
              const Icon = m.icon;
              return (
                <div key={k} className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", m.tone)}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  {m.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
