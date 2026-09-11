/** Numeric and date helpers used by the importer. Raw values are preserved separately. */

export interface AmountParse {
  amount: number | null;
  raw: string | null;
  note?: string;
}

export function parseAmount(value: unknown): AmountParse {
  if (value === null || value === undefined || value === "") return { amount: null, raw: null };
  if (typeof value === "number") return { amount: Number.isFinite(value) ? value : null, raw: String(value) };
  const raw = String(value).trim();
  const cleaned = raw.replace(/r\$/i, "").replace(/mm|milh[õo]es|mi\b/gi, "").replace(/\s+/g, "").replace(",", ".");
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return { amount: parseFloat(cleaned), raw };
  return { amount: null, raw, note: `Valor não numérico: "${raw}"` };
}

export interface DateParse {
  date: Date | null;
  raw: string | null;
  note?: string;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function parseSheetDate(value: unknown): DateParse {
  if (value === null || value === undefined || value === "") return { date: null, raw: null };
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return { date: null, raw: String(value), note: "Data inválida" };
    const utc = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    return { date: utc, raw: utc.toISOString().slice(0, 10) };
  }
  if (typeof value === "number") {
    if (value < 100) return { date: null, raw: String(value), note: "Número de série inválido" };
    const d = new Date(EXCEL_EPOCH + Math.round(value) * 86400000);
    return { date: d, raw: String(value) };
  }
  const raw = String(value).trim();
  const br = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (br) {
    let y = parseInt(br[3], 10);
    if (y < 100) y += 2000;
    const d = new Date(Date.UTC(y, parseInt(br[2], 10) - 1, parseInt(br[1], 10)));
    return isNaN(d.getTime()) ? { date: null, raw, note: "Data inválida" } : { date: d, raw };
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Date.UTC(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)));
    return isNaN(d.getTime()) ? { date: null, raw, note: "Data inválida" } : { date: d, raw };
  }
  return { date: null, raw, note: `Data não reconhecida: "${raw}"` };
}

export function parseYear(value: unknown): { year: number | null; raw: string | null; note?: string } {
  if (value === null || value === undefined || value === "") return { year: null, raw: null };
  const raw = String(value).trim();
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 2000 && n <= 2100) return { year: n, raw };
  return { year: null, raw, note: `Ano inválido: "${raw}"` };
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}
