/**
 * Text helpers shared by every normalizer. Nothing here mutates the original
 * value: callers keep the raw string and use these functions only for matching.
 */

export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Lower-case, accent-free, single-spaced key used for equality matching. */
export function normalizeKey(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return stripAccents(String(value))
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9&/+.\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\r\n/g, "\n").trim();
  return s.length ? s : null;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (["de", "da", "do", "dos", "das", "e", "&"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
