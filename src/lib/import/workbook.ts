import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { cleanText } from "../normalization/text";

export interface PipeRow {
  sourceRow: number; // 1-based Excel row number
  legacyId: number;
  raw: Record<string, unknown>;
  tipoOperacao: string | null;
  nome: string | null;
  dataEntrada: unknown;
  year: unknown;
  contato: string | null;
  tipoContato: string | null;
  descricao: string | null;
  statusOperacao: string | null;
  valor: unknown;
  responsavel: string | null;
  decisao: string | null;
  dataSaida: unknown;
  feedback: string | null;
}

export interface OriginadorRow {
  sourceRow: number;
  index: number | null;
  nome: string;
  tipo: string | null;
  casos2024: number | null;
  casos2025: number | null;
  casos2026: number | null;
  raw: Record<string, unknown>;
}

export interface EnrichmentRow {
  sheet: string;
  sourceRow: number;
  nome: string | null;
  data: unknown;
  tipoOperacao?: string | null;
  contato?: string | null;
  tipoContato?: string | null;
  categoriaDePara?: string | null;
  responsavel?: string | null;
  statusOperacao?: string | null;
  raw: Record<string, unknown>;
}

export interface MeetingSnapshotRow {
  sheet: string;
  sourceRow: number;
  meetingDate: Date;
  nome: string;
  operacao: string | null;
  setor: string | null;
  status: string | null;
  raw: Record<string, unknown>;
}

export interface ParsedWorkbook {
  fileName: string;
  fileHash: string;
  sheetNames: string[];
  pipe: PipeRow[];
  originadores: OriginadorRow[];
  enrichment: EnrichmentRow[];
  meetings: MeetingSnapshotRow[];
}

const PIPE_HEADER_ROW = 8;
const PIPE_COLUMNS = {
  legacyId: "C",
  tipoOperacao: "D",
  nome: "E",
  dataEntrada: "F",
  year: "G",
  contato: "H",
  tipoContato: "I",
  descricao: "J",
  statusOperacao: "K",
  valor: "L",
  responsavel: "M",
  decisao: "N",
  dataSaida: "O",
  feedback: "P",
} as const;

function cellValue(sheet: XLSX.WorkSheet, col: string, row: number): unknown {
  const cell = sheet[`${col}${row}`];
  if (!cell) return null;
  if (cell.t === "e") return cell.w ?? "#ERROR"; // formula error, e.g. #VALUE!
  return cell.v ?? null;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return parseInt(v, 10);
  return null;
}

function rawRecord(sheet: XLSX.WorkSheet, row: number, cols: string[]): Record<string, unknown> {
  const rec: Record<string, unknown> = {};
  for (const c of cols) {
    const v = cellValue(sheet, c, row);
    rec[c] = v instanceof Date ? v.toISOString() : v;
  }
  return rec;
}

const MEETING_SHEETS: Record<string, string> = {
  Vertical_1812: "2025-12-18",
  Vertical_1610: "2025-10-16",
  Vertical_2509: "2025-09-25",
  Vertical_2108: "2025-08-21",
  "Reunião Vertical_1707": "2025-07-17",
  "Reuniao Vertical_1505": "2025-05-15",
  "Reuniao Vertical_old": "2025-04-28",
};

export function parseWorkbook(filePath: string): ParsedWorkbook {
  const buffer = readFileSync(filePath);
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: false, cellText: true });

  // ── Pipe ────────────────────────────────────────────────────────────────
  const pipeSheet = wb.Sheets["Pipe"];
  if (!pipeSheet) throw new Error('Sheet "Pipe" not found in workbook');
  const header = cellValue(pipeSheet, PIPE_COLUMNS.legacyId, PIPE_HEADER_ROW);
  if (String(header).trim() !== "#") throw new Error(`Unexpected Pipe header at C${PIPE_HEADER_ROW}: ${String(header)}`);
  const range = XLSX.utils.decode_range(pipeSheet["!ref"] ?? "A1");
  const pipe: PipeRow[] = [];
  for (let r = PIPE_HEADER_ROW + 1; r <= range.e.r + 1; r++) {
    const legacyId = num(cellValue(pipeSheet, PIPE_COLUMNS.legacyId, r));
    if (legacyId === null) continue;
    pipe.push({
      sourceRow: r,
      legacyId,
      raw: rawRecord(pipeSheet, r, Object.values(PIPE_COLUMNS)),
      tipoOperacao: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.tipoOperacao, r)),
      nome: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.nome, r)),
      dataEntrada: cellValue(pipeSheet, PIPE_COLUMNS.dataEntrada, r),
      year: cellValue(pipeSheet, PIPE_COLUMNS.year, r),
      contato: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.contato, r)),
      tipoContato: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.tipoContato, r)),
      descricao: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.descricao, r)),
      statusOperacao: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.statusOperacao, r)),
      valor: cellValue(pipeSheet, PIPE_COLUMNS.valor, r),
      responsavel: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.responsavel, r)),
      decisao: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.decisao, r)),
      dataSaida: cellValue(pipeSheet, PIPE_COLUMNS.dataSaida, r),
      feedback: cleanText(cellValue(pipeSheet, PIPE_COLUMNS.feedback, r)),
    });
  }

  // ── Originadores ────────────────────────────────────────────────────────
  const originadores: OriginadorRow[] = [];
  const oriSheet = wb.Sheets["Originadores"];
  if (oriSheet) {
    const oriRange = XLSX.utils.decode_range(oriSheet["!ref"] ?? "A1");
    for (let r = 5; r <= oriRange.e.r + 1; r++) {
      const nome = cleanText(cellValue(oriSheet, "D", r));
      if (!nome) continue;
      originadores.push({
        sourceRow: r,
        index: num(cellValue(oriSheet, "C", r)),
        nome,
        tipo: cleanText(cellValue(oriSheet, "E", r)),
        casos2024: num(cellValue(oriSheet, "F", r)),
        casos2025: num(cellValue(oriSheet, "G", r)),
        casos2026: num(cellValue(oriSheet, "H", r)),
        raw: rawRecord(oriSheet, r, ["C", "D", "E", "F", "G", "H"]),
      });
    }
  }

  // ── Enrichment sheets ───────────────────────────────────────────────────
  const enrichment: EnrichmentRow[] = [];
  const an = wb.Sheets["Analise Originação 2025"];
  if (an) {
    const rg = XLSX.utils.decode_range(an["!ref"] ?? "A1");
    for (let r = 3; r <= rg.e.r + 1; r++) {
      const nome = cleanText(cellValue(an, "L", r));
      const data = cellValue(an, "M", r);
      if (!nome && !data) continue;
      enrichment.push({
        sheet: "Analise Originação 2025",
        sourceRow: r,
        nome,
        data,
        tipoOperacao: cleanText(cellValue(an, "K", r)),
        contato: cleanText(cellValue(an, "O", r)),
        tipoContato: cleanText(cellValue(an, "P", r)),
        categoriaDePara: cleanText(cellValue(an, "Q", r)),
        raw: rawRecord(an, r, ["K", "L", "M", "N", "O", "P", "Q"]),
      });
    }
  }
  const ori = wb.Sheets["Originação"];
  if (ori) {
    const rg = XLSX.utils.decode_range(ori["!ref"] ?? "A1");
    for (let r = 4; r <= rg.e.r + 1; r++) {
      const nome = cleanText(cellValue(ori, "B", r));
      const data = cellValue(ori, "C", r);
      if (!nome && !data) continue;
      enrichment.push({
        sheet: "Originação",
        sourceRow: r,
        nome,
        data,
        contato: cleanText(cellValue(ori, "D", r)),
        categoriaDePara: cleanText(cellValue(ori, "H", r)),
        raw: rawRecord(ori, r, ["B", "C", "D", "E", "H"]),
      });
    }
  }
  const out = wb.Sheets["Output"];
  if (out) {
    const rg = XLSX.utils.decode_range(out["!ref"] ?? "A1");
    for (let r = 3; r <= rg.e.r + 1; r++) {
      const nome = cleanText(cellValue(out, "D", r));
      if (!nome) continue;
      enrichment.push({
        sheet: "Output",
        sourceRow: r,
        nome,
        data: cellValue(out, "E", r),
        tipoOperacao: cleanText(cellValue(out, "C", r)),
        contato: cleanText(cellValue(out, "F", r)),
        statusOperacao: cleanText(cellValue(out, "G", r)),
        responsavel: cleanText(cellValue(out, "H", r)),
        raw: rawRecord(out, r, ["B", "C", "D", "E", "F", "G", "H"]),
      });
    }
  }

  // ── Vertical meeting snapshots ──────────────────────────────────────────
  const meetings: MeetingSnapshotRow[] = [];
  for (const [sheetName, isoDate] of Object.entries(MEETING_SHEETS)) {
    const sh = wb.Sheets[sheetName];
    if (!sh) continue;
    const rg = XLSX.utils.decode_range(sh["!ref"] ?? "A1");
    // find header column of "Ativos Financeiros"
    let nameCol: string | null = null;
    let headerRow = 0;
    outer: for (let r = 1; r <= 5; r++) {
      for (let c = 0; c <= rg.e.c; c++) {
        const col = XLSX.utils.encode_col(c);
        if (String(cellValue(sh, col, r) ?? "").trim() === "Ativos Financeiros") {
          nameCol = col;
          headerRow = r;
          break outer;
        }
      }
    }
    if (!nameCol) continue;
    const ci = XLSX.utils.decode_col(nameCol);
    const opCol = XLSX.utils.encode_col(ci + 1);
    const secCol = XLSX.utils.encode_col(ci + 2);
    const stCol = XLSX.utils.encode_col(ci + 3);
    const idxCol = XLSX.utils.encode_col(ci - 1);
    for (let r = headerRow + 1; r <= rg.e.r + 1; r++) {
      const nome = cleanText(cellValue(sh, nameCol, r));
      const idx = num(cellValue(sh, idxCol, r));
      if (!nome || idx === null) continue;
      meetings.push({
        sheet: sheetName,
        sourceRow: r,
        meetingDate: new Date(`${isoDate}T00:00:00Z`),
        nome,
        operacao: cleanText(cellValue(sh, opCol, r)),
        setor: cleanText(cellValue(sh, secCol, r)),
        status: cleanText(cellValue(sh, stCol, r)),
        raw: rawRecord(sh, r, [idxCol, nameCol, opCol, secCol, stCol]),
      });
    }
  }

  return { fileName: basename(filePath), fileHash, sheetNames: wb.SheetNames, pipe, originadores, enrichment, meetings };
}
