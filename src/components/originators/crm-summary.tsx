import { KpiCard } from "@/components/common/kpi-card";
import { formatInt, formatMM } from "@/lib/utils";
import type { OriginatorCrmRow } from "@/lib/queries/originators";

/** Answers the CRM questions at a glance: who brings the most, who converts, who needs follow-up, who is cooling off. */
export function CrmSummary({ rows, year, kind }: { rows: OriginatorCrmRow[]; year: number; kind: "contact" | "company" }) {
  const withCases = rows.filter((r) => r.casesTotal > 0);
  const topYear = [...withCases].sort((a, b) => b.casesYear - a.casesYear)[0];
  const topAll = [...withCases].sort((a, b) => b.casesTotal - a.casesTotal)[0];
  const topConcluded = [...withCases].sort((a, b) => b.concluded - a.concluded || b.advanced - a.advanced)[0];
  const topVolume = [...withCases].sort((a, b) => b.volume - a.volume)[0];
  const now = new Date();
  const needFollowUp = rows.filter((r) => r.nextFollowUpAt && new Date(r.nextFollowUpAt) <= now).length;
  const cooling = withCases.filter((r) => !r.lastInteractionAt || (now.getTime() - new Date(r.lastInteractionAt).getTime()) / 86400000 > 120).length;
  const label = kind === "contact" ? "originadores" : "empresas";
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
      <KpiCard label={`Quem mais trouxe em ${year}`} value={<span className="text-base leading-tight">{topYear?.casesYear ? topYear.name : "—"}</span>} hint={topYear?.casesYear ? `${topYear.casesYear} casos` : "sem casos no ano"} accent="green" />
      <KpiCard label="Quem mais trouxe (histórico)" value={<span className="text-base leading-tight">{topAll?.name ?? "—"}</span>} hint={topAll ? `${topAll.casesTotal} casos` : ""} />
      <KpiCard label="Mais deals concluídos" value={<span className="text-base leading-tight">{topConcluded?.concluded ? topConcluded.name : "—"}</span>} hint={topConcluded?.concluded ? `${topConcluded.concluded} concluídos · ${topConcluded.advanced} avançaram` : "nenhum concluído"} accent="blue" />
      <KpiCard label="Maior volume originado" value={<span className="text-base leading-tight">{topVolume?.volume ? topVolume.name : "—"}</span>} hint={topVolume?.volume ? formatMM(topVolume.volume, { compact: true }) : "sem valores informados"} />
      <KpiCard label="Precisam de follow-up" value={formatInt(needFollowUp)} hint="follow-up vencido ou hoje" accent={needFollowUp ? "amber" : "none"} />
      <KpiCard label="Relacionamentos esfriando" value={formatInt(cooling)} hint={`${label} com casos e >120 dias sem interação`} accent={cooling ? "red" : "none"} />
    </div>
  );
}
