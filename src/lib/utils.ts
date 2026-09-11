import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const brl = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const intFmt = new Intl.NumberFormat("pt-BR");

/** Formats a value in R$ millions (the unit used by the team). */
export function formatMM(value: number | string | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "—";
  if (opts.compact && Math.abs(n) >= 1000) return `R$ ${brl.format(n / 1000)} bi`;
  return `R$ ${brl2.format(n)} mm`;
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return intFmt.format(value);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function daysSince(value: Date | string | null | undefined, until: Date = new Date()): number | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((until.getTime() - d.getTime()) / 86400000));
}

export function agingBucket(days: number | null): "<15" | "15–30" | "31–60" | "61–90" | ">90" | "—" {
  if (days === null) return "—";
  if (days < 15) return "<15";
  if (days <= 30) return "15–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return ">90";
}

export const AGING_BUCKETS = ["<15", "15–30", "31–60", "61–90", ">90"] as const;

export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS_PT[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
