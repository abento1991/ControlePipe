/**
 * The historical "Status da Operação" and "Feedback" cells contain running logs such as
 *   "02/02 - Realizamos o call...\n08/02 - Enviaram dados...".
 * This parser turns each dated line into a timeline entry. Dates in the sheet have no year, so the
 * year is inferred from the opportunity's entry date (rolling forward when the month goes backwards).
 * Every inferred date is flagged so the UI can show it as approximate.
 */

export interface LegacyTimelineEntry {
  text: string;
  occurredAt: Date | null;
  dateInferred: boolean;
  rawPrefix: string | null;
}

const LINE_DATE = /^\s*(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\s*[-–:]?\s*(.*)$/;
const MONTH_NAMES: Record<string, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const LINE_MONTH = /^\s*([a-zç]{3})[a-zç]*\s*[\/-]\s*(\d{2,4})\s*[-–:]?\s*(.*)$/i;

export function parseLegacyLog(text: string | null | undefined, anchor: Date | null): LegacyTimelineEntry[] {
  if (!text) return [];
  const lines = text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: LegacyTimelineEntry[] = [];
  let year = anchor ? anchor.getUTCFullYear() : null;
  let lastMonth = anchor ? anchor.getUTCMonth() : null;
  let current: LegacyTimelineEntry | null = null;

  for (const line of lines) {
    const m = line.match(LINE_DATE);
    const mm = !m ? line.match(LINE_MONTH) : null;
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      let explicitYear: number | null = null;
      if (m[3]) {
        explicitYear = parseInt(m[3], 10);
        if (explicitYear < 100) explicitYear += 2000;
      }
      let occurredAt: Date | null = null;
      let inferred = false;
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        if (explicitYear) {
          year = explicitYear;
        } else if (year !== null) {
          if (lastMonth !== null && month < lastMonth - 6) year += 1; // rolled into the next year
          inferred = true;
        }
        if (year !== null) {
          occurredAt = new Date(Date.UTC(year, month, day));
          if (isNaN(occurredAt.getTime())) occurredAt = null;
          lastMonth = month;
        }
      }
      current = { text: m[4].trim() || line, occurredAt, dateInferred: inferred || (!explicitYear && occurredAt !== null), rawPrefix: line.slice(0, line.length - m[4].length).trim() };
      entries.push(current);
    } else if (mm && MONTH_NAMES[mm[1].toLowerCase()] !== undefined) {
      const month = MONTH_NAMES[mm[1].toLowerCase()];
      let y = parseInt(mm[2], 10);
      if (y < 100) y += 2000;
      current = { text: mm[3].trim() || line, occurredAt: new Date(Date.UTC(y, month, 1)), dateInferred: true, rawPrefix: `${mm[1]}/${mm[2]}` };
      entries.push(current);
    } else if (current) {
      current.text = `${current.text}\n${line}`;
    } else {
      current = { text: line, occurredAt: null, dateInferred: false, rawPrefix: null };
      entries.push(current);
    }
  }
  return entries;
}

/** Detects milestone keywords inside legacy log lines so the funnel can use them where available. */
export function detectMilestones(text: string): { proposalSent: boolean; deepAnalysis: boolean; declined: boolean; concluded: boolean } {
  const k = text.toLowerCase();
  return {
    proposalSent: /(enviamos|mandamos|colocamos|apresentamos)[^.\n]{0,40}proposta|proposta (enviada|indicativa enviada|assinada)|term ?sheet|\bnbo\b/.test(k),
    deepAnalysis: /(data ?room|vdr|diligenc|modelo|modelagem|precifica|comit[eê])/.test(k),
    declined: /(declin|negar|negamos|não vamos seguir|nao vamos seguir|passamos|desist)/.test(k),
    concluded: /(investimos|investida|desembols|concluído|concluido|fechamos)/.test(k),
  };
}
