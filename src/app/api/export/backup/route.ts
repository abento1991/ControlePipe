import { DECLINE_REASON_LABELS, DECLINED_BY_LABELS } from "@/lib/normalization/decline-reasons";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CHANNEL_LABELS } from "@/lib/queries/dashboard";
import { COMPANY_CATEGORY_LABELS } from "@/lib/normalization/originators";

const d = (v: Date | null | undefined) => (v ? v.toISOString().slice(0, 10) : "");
const dt = (v: Date | null | undefined) => (v ? v.toISOString().replace("T", " ").slice(0, 16) : "");

/** Full backup workbook: every opportunity (normalized + original columns), timeline, companies, contacts. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [opps, activities, companies, contacts] = await Promise.all([
    prisma.opportunity.findMany({ where: { isDeleted: false }, orderBy: [{ legacyId: "asc" }, { createdAt: "asc" }], include: { operationType: true, status: true, assignees: { include: { user: true } }, originators: { where: { role: "PRIMARY" }, include: { company: true, contact: true } }, notes: { orderBy: { createdAt: "asc" } } } }),
    prisma.activity.findMany({ orderBy: [{ opportunityId: "asc" }, { occurredAt: "asc" }], include: { opportunity: { select: { legacyId: true, name: true } }, user: { select: { name: true } } } }),
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" }, include: { company: { select: { name: true } } } }),
  ]);
  const cat = (c: string | null) => (c ? COMPANY_CATEGORY_LABELS[c as keyof typeof COMPANY_CATEGORY_LABELS] ?? c : "");
  const oppRows = opps.map((o) => {
    const prim = o.originators[0];
    return {
      "#": o.legacyId ?? "",
      ID: o.id,
      Oportunidade: o.name,
      "Nome (planilha)": o.nameRaw ?? "",
      "Grupo econômico": o.economicGroup ?? "",
      Setor: o.sector ?? "",
      Tipo: o.operationType?.name ?? "",
      "Tipo (planilha)": o.operationTypeRaw ?? "",
      Status: o.status.name,
      Resultado: o.status.outcome,
      "Decisão (planilha)": o.statusRaw ?? "",
      "Data de entrada": d(o.entryDate),
      Ano: o.entryYear ?? "",
      "Data de saída": d(o.exitDate),
      "Valor (R$ mm)": o.amount === null ? "" : Number(o.amount),
      "Valor (planilha)": o.amountRaw ?? "",
      "Empresa originadora": prim?.company?.name ?? "",
      Originador: prim?.contact?.fullName ?? "",
      "Contato (planilha)": o.originatorRaw ?? "",
      "Categoria do originador": cat(o.originatorCategory),
      Canal: o.entryChannel ? CHANNEL_LABELS[o.entryChannel] : "",
      "Assunto do e-mail": o.emailSubject ?? "",
      Responsáveis: o.assignees.map((a) => a.user.name).join(", "),
      "Responsável (planilha)": o.assigneesRaw ?? "",
      "Próxima ação": o.nextAction ?? "",
      "Follow-up": d(o.nextFollowUpAt),
      "Última atividade": d(o.lastActivityAt),
      "Status da operação (planilha)": o.legacyStatusText ?? "",
      "Feedback (planilha)": o.legacyFeedback ?? "",
      "Motivo / feedback": o.closeReason ?? "",
      "Motivo (categoria)": o.declineReason ? DECLINE_REASON_LABELS[o.declineReason] : "",
      "Quem recusou": o.declinedBy ? DECLINED_BY_LABELS[o.declinedBy] : "",
      "Motivo inferido do texto": o.declineReason ? (o.declineReasonInferred ? "sim" : "não") : "",
      Descrição: o.description ?? "",
      "Notas de análise": o.notes.map((n) => `[${d(n.createdAt)}] ${n.body}`).join("\n"),
      "Criado em": dt(o.createdAt),
      "Atualizado em": dt(o.updatedAt),
    };
  });
  const actRows = activities.map((a) => ({ "#": a.opportunity.legacyId ?? "", Oportunidade: a.opportunity.name, Data: d(a.occurredAt), Tipo: a.type, Título: a.title ?? "", Texto: a.body ?? "", Usuário: a.user?.name ?? "", "Origem planilha": a.isLegacy ? `${a.sourceSheet ?? ""} linha ${a.sourceRow ?? ""}` : "" }));
  const coRows = companies.map((c) => ({ Empresa: c.name, "Nome curto": c.shortName ?? "", Categoria: cat(c.category), Website: c.website ?? "", Relacionamento: c.relationship, "Última interação": d(c.lastInteractionAt), Notas: c.notes ?? "" }));
  const ctRows = contacts.map((c) => ({ Nome: c.fullName, Empresa: c.company?.name ?? "", Cargo: c.title ?? "", "E-mail": c.email ?? "", Telefone: c.phone ?? "", WhatsApp: c.whatsapp ?? "", LinkedIn: c.linkedin ?? "", Categoria: cat(c.category), Relacionamento: c.relationship, "Último contato": d(c.lastContactAt), "Próximo follow-up": d(c.nextFollowUpAt), Observações: c.notes ?? "" }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(oppRows), "Oportunidades");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actRows), "Histórico");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coRows), "Empresas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ctRows), "Contatos");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="leto-pipeline-backup-${stamp}.xlsx"` } });
}
