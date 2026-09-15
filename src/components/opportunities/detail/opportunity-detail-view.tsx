"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, CheckCircle2, ExternalLink, Mail, MessageCircle, MoreHorizontal, PauseCircle, Pencil, Phone, PlayCircle, Trash2, User, XCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, TypeBadge } from "@/components/common/badges";
import { AssigneeAvatars } from "@/components/common/user-avatar";
import { OpportunityFormDialog } from "../opportunity-form-dialog";
import { Timeline } from "./timeline";
import { NotesPanel } from "./notes-panel";
import { AttachmentsPanel } from "./attachments-panel";
import { AuditPanel, RawDataPanel } from "./audit-panel";
import { OriginatorPanel } from "./originator-panel";
import { useReference } from "@/components/layout/reference-context";
import { closeOpportunity, reactivateOpportunity, deleteOpportunity } from "@/lib/actions/opportunities";
import { duplicateOpportunityAsAdminTask } from "@/lib/actions/admin-tasks";
import { DeclineFields, EMPTY_DECLINE, type DeclineValue } from "../decline-fields";
import { DECLINE_REASON_LABELS, DECLINED_BY_LABELS, type DeclineReasonKey, type DeclinedByKey } from "@/lib/normalization/decline-reasons";
import { CHANNEL_LABELS } from "@/lib/queries/dashboard";
import { COMPANY_CATEGORY_LABELS } from "@/lib/normalization/originators";
import { ISSUE_LABELS } from "@/lib/constants";
import { cn, formatDate, formatMM, whatsappLink } from "@/lib/utils";
import type { OpportunityDetailDTO } from "./serialize";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{children ?? "—"}</div>
    </div>
  );
}

export function OpportunityDetailView({ data: o, isAdmin }: { data: OpportunityDetailDTO; isAdmin: boolean }) {
  const router = useRouter();
  const ref = useReference();
  const [edit, setEdit] = useState(false);
  const [closeDialog, setCloseDialog] = useState<null | "DECLINED" | "INACTIVE" | "CONCLUDED" | "ON_HOLD">(null);
  const [reactivate, setReactivate] = useState(false);
  const [pending, start] = useTransition();
  const isOpen = o.status.group === "ACTIVE";
  const overdue = o.nextFollowUpAt ? new Date(o.nextFollowUpAt) < new Date(new Date().toDateString()) : false;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={isOpen ? "/pipeline" : "/opportunities"} className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {isOpen ? "Pipe Ativo" : "Oportunidades"}
        </Link>
        {o.legacyId && <span>· planilha #{o.legacyId}</span>}
      </div>

      {/* Header */}
      <div className="rounded-lg border bg-card shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{o.name}</h1>
              <StatusBadge name={o.status.name} color={o.status.color} group={o.status.group} className="text-xs px-2.5 py-1" />
              {o.needsReview && (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> revisar
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <TypeBadge name={o.operationType?.name ?? o.operationTypeRaw ?? null} color={o.operationType?.color} />
              {o.economicGroup && <span>{o.economicGroup}</span>}
              {o.sector && <span>· {o.sector}</span>}
              <span>· Resultado: <span className="font-medium text-foreground">{o.status.outcome}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOpen && o.status.group !== "LEGACY" && (
              <Button variant="accent" size="sm" onClick={() => setReactivate(true)} disabled={pending}>
                <PlayCircle /> Reativar
              </Button>
            )}
            {o.status.group === "LEGACY" && (
              <Button variant="accent" size="sm" onClick={() => setReactivate(true)} disabled={pending}>
                <PlayCircle /> Classificar como ativa
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              <Pencil /> Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {o.status.key !== "ON_HOLD" && (
                  <DropdownMenuItem onSelect={() => setCloseDialog("ON_HOLD")}>
                    <PauseCircle /> Colocar em On Hold
                  </DropdownMenuItem>
                )}
                {o.status.key !== "CONCLUDED" && (
                  <DropdownMenuItem onSelect={() => setCloseDialog("CONCLUDED")}>
                    <CheckCircle2 /> Marcar como concluída / investida
                  </DropdownMenuItem>
                )}
                {o.status.key !== "DECLINED" && (
                  <DropdownMenuItem onSelect={() => setCloseDialog("DECLINED")}>
                    <XCircle /> Declinar
                  </DropdownMenuItem>
                )}
                {o.status.key !== "INACTIVE" && (
                  <DropdownMenuItem onSelect={() => setCloseDialog("INACTIVE")}>
                    <XCircle /> Marcar como inativa
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() =>
                    start(async () => {
                      const res = await duplicateOpportunityAsAdminTask(o.id);
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success(res.data.existed ? "Já existe uma tarefa administrativa para este caso." : "Copiado para as tarefas administrativas.");
                        router.push(`/tarefas?task=${res.data.id}`);
                      }
                    })
                  }
                >
                  <ClipboardList /> Duplicar como tarefa administrativa
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-danger"
                      onSelect={() => {
                        if (confirm("Excluir esta oportunidade? Ela ficará oculta (exclusão lógica) e o histórico é preservado.")) {
                          run(() => deleteOpportunity(o.id), "Oportunidade excluída.");
                          router.push("/opportunities");
                        }
                      }}
                    >
                      <Trash2 /> Excluir (admin)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <Field label="Valor">
            <span className="font-semibold tabular">{o.amount !== null ? formatMM(o.amount) : o.amountRaw ?? "—"}</span>
          </Field>
          <Field label="Data de entrada">
            <span className="tabular">{formatDate(o.entryDate)}</span>
            {!o.entryDate && o.entryDateRaw && <span className="text-2xs text-muted-foreground ml-1">({o.entryDateRaw})</span>}
          </Field>
          <Field label="Dias no pipeline">
            <span className={cn("tabular font-semibold", (o.daysInPipeline ?? 0) > 90 && isOpen && "text-danger")}>{o.daysInPipeline ?? "—"}</span>
            {!isOpen && o.exitDate && <span className="text-2xs text-muted-foreground ml-1">até {formatDate(o.exitDate)}</span>}
          </Field>
          <Field label="Responsáveis">
            <div className="flex items-center gap-2">
              <AssigneeAvatars users={o.assignees} max={4} size="md" />
              <span className="text-xs text-muted-foreground">{o.assignees.map((a) => a.name.split(" ")[0]).join(", ") || (o.assigneesRaw ? `planilha: ${o.assigneesRaw}` : "—")}</span>
            </div>
          </Field>
          <Field label="Originação">
            <span className="text-sm">
              {o.originator?.company ? (
                <Link href={`/companies/${o.originator.company.id}`} className="hover:underline">
                  {o.originator.company.name}
                </Link>
              ) : null}
              {o.originator?.company && o.originator.contact ? " · " : ""}
              {o.originator?.contact ? (
                <Link href={`/originators/${o.originator.contact.id}`} className="hover:underline">
                  {o.originator.contact.fullName}
                </Link>
              ) : null}
              {!o.originator?.company && !o.originator?.contact && <span className="text-muted-foreground">{o.originatorRaw ?? "—"}</span>}
            </span>
          </Field>
          <Field label="Próxima ação">
            <span className={cn(!o.nextAction && "text-muted-foreground italic")}>{o.nextAction ?? "não definida"}</span>
          </Field>
          <Field label="Follow-up">
            <span className={cn("inline-flex items-center gap-1 tabular", overdue && "text-danger font-semibold")}>
              <CalendarClock className="h-3.5 w-3.5" /> {formatDate(o.nextFollowUpAt)}
            </span>
          </Field>
        </div>
        {o.issues.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {o.issues.map((i) => (
              <Link key={i.id} href={`/admin/data-quality?code=${i.code}`} title={i.message}>
                <Badge variant={i.severity === "ERROR" ? "danger" : i.severity === "WARNING" ? "warning" : "muted"}>{ISSUE_LABELS[i.code] ?? i.code}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="origination">Originação</TabsTrigger>
          <TabsTrigger value="analysis">Análise ({o.notes.length})</TabsTrigger>
          <TabsTrigger value="timeline">Histórico ({o.activities.length})</TabsTrigger>
          <TabsTrigger value="files">Arquivos ({o.attachments.length})</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          {o.importRows.length > 0 && <TabsTrigger value="raw">Planilha original</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-lg border bg-card shadow-card p-5 space-y-5">
              <Field label="Descrição">
                <p className="whitespace-pre-wrap leading-relaxed">{o.description ?? <span className="text-muted-foreground">Sem descrição.</span>}</p>
              </Field>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Tipo de operação">
                  {o.operationType?.name ?? "—"}
                  {o.operationTypeRaw && o.operationTypeRaw !== o.operationType?.name && <div className="text-2xs text-muted-foreground">planilha: “{o.operationTypeRaw}”</div>}
                </Field>
                <Field label="Estágio / status">
                  {o.status.name}
                  {o.statusRaw && <div className="text-2xs text-muted-foreground">planilha: “{o.statusRaw}”</div>}
                </Field>
                <Field label="Resultado">{o.status.outcome}</Field>
                <Field label="Valor">{o.amount !== null ? formatMM(o.amount) : o.amountRaw ?? "—"}</Field>
                <Field label="Data de entrada">
                  {formatDate(o.entryDate)}
                  {o.entryYearRaw && String(o.entryYear) !== o.entryYearRaw && <div className="text-2xs text-warning">ano na planilha: {o.entryYearRaw}</div>}
                </Field>
                <Field label="Data de saída">{formatDate(o.exitDate)}</Field>
                <Field label="Próxima ação">{o.nextAction ?? "—"}</Field>
                <Field label="Follow-up">{formatDate(o.nextFollowUpAt)}</Field>
                <Field label="Última atividade">{formatDate(o.lastActivityAt)}</Field>
                <Field label="Responsáveis">
                  <div className="flex flex-wrap gap-1">
                    {o.assignees.map((a) => (
                      <Badge key={a.id} variant={a.isArchived ? "muted" : "secondary"}>
                        {a.name}
                      </Badge>
                    ))}
                    {!o.assignees.length && "—"}
                  </div>
                  {o.assigneesRaw && <div className="text-2xs text-muted-foreground mt-1">planilha: “{o.assigneesRaw}”</div>}
                </Field>
                {o.declineReason && (
                  <Field label="Motivo da recusa">
                    {DECLINE_REASON_LABELS[o.declineReason as DeclineReasonKey]}
                    {o.declinedBy && <span className="text-muted-foreground"> · {DECLINED_BY_LABELS[o.declinedBy as DeclinedByKey]}</span>}
                    {o.declineReasonInferred && <span className="block text-2xs text-muted-foreground">classificado automaticamente a partir do texto da planilha</span>}
                  </Field>
                )}
                {o.closeReason && <Field label="Motivo do encerramento">{o.closeReason}</Field>}
              </div>
            </div>
            <div className="space-y-4">
              {o.legacyStatusText && (
                <div className="rounded-lg border bg-card shadow-card p-4">
                  <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Status da operação (planilha)</div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto scrollbar-thin">{o.legacyStatusText}</p>
                </div>
              )}
              {o.legacyFeedback && (
                <div className="rounded-lg border bg-card shadow-card p-4">
                  <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Feedback (planilha)</div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{o.legacyFeedback}</p>
                </div>
              )}
              {o.followUps.length > 0 && (
                <div className="rounded-lg border bg-card shadow-card p-4">
                  <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Follow-ups</div>
                  <ul className="space-y-1 text-xs">
                    {o.followUps.map((f) => (
                      <li key={f.id} className={cn("flex gap-2", f.completedAt && "text-muted-foreground line-through")}>
                        <span className="tabular w-16">{formatDate(f.dueAt)}</span>
                        <span className="flex-1">{f.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="origination">
          <OriginatorPanel data={o} />
        </TabsContent>

        <TabsContent value="analysis">
          <NotesPanel opportunityId={o.id} notes={o.notes} />
        </TabsContent>

        <TabsContent value="timeline">
          <Timeline opportunityId={o.id} activities={o.activities} followUps={o.followUps} />
        </TabsContent>

        <TabsContent value="files">
          <AttachmentsPanel opportunityId={o.id} attachments={o.attachments} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditPanel logs={o.auditLogs} />
        </TabsContent>

        {o.importRows.length > 0 && (
          <TabsContent value="raw">
            <RawDataPanel rows={o.importRows} />
          </TabsContent>
        )}
      </Tabs>

      <OpportunityFormDialog
        open={edit}
        onOpenChange={setEdit}
        initial={{
          id: o.id,
          name: o.name,
          economicGroup: o.economicGroup,
          operationTypeId: o.operationType?.id ?? null,
          entryDate: o.entryDate,
          amount: o.amount,
          company: o.originator?.company ? { id: o.originator.company.id, label: o.originator.company.name } : null,
          contact: o.originator?.contact ? { id: o.originator.contact.id, label: o.originator.contact.fullName, hint: o.originator.company?.name ?? null } : null,
          entryChannel: o.entryChannel,
          emailSubject: o.emailSubject,
          emailSender: o.emailSender,
          emailDate: o.emailDate,
          whatsappContact: o.whatsappContact,
          whatsappNumber: o.whatsappNumber,
          whatsappSummary: o.whatsappSummary,
          firstContactAt: o.firstContactAt,
          description: o.description,
          sector: o.sector,
          assigneeIds: o.assignees.map((a) => a.id),
          statusKey: o.status.key,
          nextAction: o.nextAction,
          nextFollowUpAt: o.nextFollowUpAt,
        }}
        onSaved={() => router.refresh()}
      />

      <CloseDialog target={closeDialog} onOpenChange={(v) => !v && setCloseDialog(null)} onConfirm={(reason, decline) => run(() => closeOpportunity(o.id, closeDialog!, reason, decline ? { declineReason: decline.declineReason, declinedBy: decline.declinedBy } : undefined), "Status atualizado.")} pending={pending} />
      <ReactivateDialog open={reactivate} onOpenChange={setReactivate} statuses={ref.statuses.filter((s) => s.group === "ACTIVE")} onConfirm={(key, note) => run(() => reactivateOpportunity(o.id, key, note), "Oportunidade reativada.")} pending={pending} previous={o.status.name} />
    </div>
  );
}

const CLOSE_LABELS: Record<string, { title: string; desc: string }> = {
  ON_HOLD: { title: "Colocar em On Hold", desc: "A oportunidade sai do pipe ativo mas pode ser reativada a qualquer momento." },
  CONCLUDED: { title: "Concluir / investir", desc: "Marca o negócio como efetivamente concluído. Registra data e usuário na auditoria." },
  DECLINED: { title: "Declinar oportunidade", desc: "Encerra sem investimento. Informe o motivo — ele fica no histórico e alimenta os relatórios." },
  INACTIVE: { title: "Marcar como inativa", desc: "Encerra por inatividade (sem retorno, perdeu relevância)." },
};

function CloseDialog({ target, onOpenChange, onConfirm, pending }: { target: string | null; onOpenChange: (v: boolean) => void; onConfirm: (reason: string, decline?: DeclineValue) => void; pending: boolean }) {
  const [reason, setReason] = useState("");
  const [decline, setDecline] = useState<DeclineValue>(EMPTY_DECLINE);
  const meta = target ? CLOSE_LABELS[target] : null;
  const declining = target === "DECLINED";
  const canConfirm = !declining || (!!decline.declineReason && !!decline.declinedBy && (decline.declineReason !== "OUTRO" || decline.closeReason.trim().length > 0));
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{meta?.title}</DialogTitle>
          <DialogDescription>{meta?.desc}</DialogDescription>
        </DialogHeader>
        {declining ? (
          <DeclineFields value={decline} onChange={setDecline} />
        ) : (
          <div className="space-y-1.5">
            <Label>{target === "CONCLUDED" ? "Observações" : "Motivo"}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={target === "DECLINED" || target === "INACTIVE" ? "destructive" : "default"}
            disabled={pending || !canConfirm}
            onClick={() => {
              onConfirm(declining ? decline.closeReason.trim() : reason, declining ? decline : undefined);
              onOpenChange(false);
              setReason("");
              setDecline(EMPTY_DECLINE);
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReactivateDialog({ open, onOpenChange, statuses, onConfirm, pending, previous }: { open: boolean; onOpenChange: (v: boolean) => void; statuses: { key: string; name: string }[]; onConfirm: (key: string, note: string) => void; pending: boolean; previous: string }) {
  const [key, setKey] = useState("ANALYSIS");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reativar oportunidade</DialogTitle>
          <DialogDescription>Status anterior: {previous}. A reativação registra data, usuário e status na timeline e na auditoria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Novo status</Label>
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            disabled={pending}
            onClick={() => {
              onConfirm(key, note);
              onOpenChange(false);
            }}
          >
            <PlayCircle /> Reativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContactActions({ email, whatsapp, phone, name }: { email?: string | null; whatsapp?: string | null; phone?: string | null; name?: string }) {
  const wa = whatsappLink(whatsapp ?? phone, name ? `Olá ${name.split(" ")[0]}, ` : undefined);
  return (
    <div className="flex flex-wrap gap-1.5">
      {email && (
        <Button size="xs" variant="outline" asChild>
          <a href={`mailto:${email}`}>
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
      {phone && (
        <Button size="xs" variant="outline" asChild>
          <a href={`tel:${phone.replace(/\s/g, "")}`}>
            <Phone /> {phone}
          </a>
        </Button>
      )}
    </div>
  );
}

export { Field, Building2, User, ExternalLink, CHANNEL_LABELS, COMPANY_CATEGORY_LABELS };
