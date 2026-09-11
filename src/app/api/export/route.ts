import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { exportOpportunities } from "@/lib/queries/opportunities";
import { parseFilters } from "@/lib/queries/filters";
import { CHANNEL_LABELS } from "@/lib/queries/dashboard";
import { COMPANY_CATEGORY_LABELS } from "@/lib/normalization/originators";

const BASE_GROUPS: Record<string, ("ACTIVE" | "ON_HOLD" | "CONCLUDED" | "CLOSED" | "LEGACY")[]> = {
  pipeline: ["ACTIVE"],
  "on-hold": ["ON_HOLD", "CLOSED", "CONCLUDED"],
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseFilters(sp);
  const base = url.searchParams.get("base");
  if (base && BASE_GROUPS[base] && !filters.groups) filters.groups = BASE_GROUPS[base];
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const sort = { id: url.searchParams.get("sort") ?? "entryDate", desc: (url.searchParams.get("dir") ?? "desc") === "desc" };
  const rows = await exportOpportunities({ filters, sort });

  const data = rows.map((r) => ({
    "#": r.legacyId ?? "",
    Oportunidade: r.name,
    "Grupo econômico": r.economicGroup ?? "",
    Tipo: r.operationType?.name ?? "",
    "Tipo (planilha)": r.operationTypeRaw ?? "",
    "Data de entrada": r.entryDate ? r.entryDate.slice(0, 10) : "",
    Ano: r.entryYear ?? "",
    "Dias no pipeline": r.daysInPipeline ?? "",
    "Empresa originadora": r.company?.name ?? "",
    Originador: r.contact?.fullName ?? "",
    "Contato (planilha)": r.originatorRaw ?? "",
    "Categoria do originador": r.originatorCategory ? COMPANY_CATEGORY_LABELS[r.originatorCategory as keyof typeof COMPANY_CATEGORY_LABELS] : "",
    Canal: r.entryChannel ? CHANNEL_LABELS[r.entryChannel] : "",
    Responsáveis: r.assignees.map((a) => a.name).join(", "),
    "Responsável (planilha)": r.assigneesRaw ?? "",
    Status: r.status.name,
    Resultado: r.status.outcome,
    "Valor (R$ mm)": r.amount ?? r.amountRaw ?? "",
    "Próxima ação": r.nextAction ?? "",
    "Follow-up": r.nextFollowUpAt ? r.nextFollowUpAt.slice(0, 10) : "",
    "Data de saída": r.exitDate ? r.exitDate.slice(0, 10) : "",
    Setor: r.sector ?? "",
    "Última atividade": r.lastActivityAt ? r.lastActivityAt.slice(0, 10) : "",
  }));

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oportunidades");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="leto-pipeline-${stamp}.xlsx"` } });
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = "﻿" + XLSX.utils.sheet_to_csv(ws, { FS: ";" });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leto-pipeline-${stamp}.csv"` } });
}
