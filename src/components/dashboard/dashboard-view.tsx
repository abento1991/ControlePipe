"use client";

import Link from "next/link";
import { AlertCircle, CalendarClock, ChevronRight, UserCircle2 } from "lucide-react";
import { KpiCard } from "@/components/common/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Columns, Donut, Funnel, HorizontalBars, MonthlySeries } from "@/components/charts/charts";
import { StatusBadge } from "@/components/common/badges";
import { AssigneeAvatars } from "@/components/common/user-avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardData } from "@/lib/queries/dashboard";
import type { PersonalDashboard } from "@/lib/queries/dashboard";
import { formatDate, formatInt, formatMM, formatPct, monthLabel, cn } from "@/lib/utils";

export function DashboardView({ data, personal, periodLabel, userName }: { data: DashboardData; personal: PersonalDashboard; periodLabel: string; userName: string }) {
  const k = data.kpi;
  const months = data.byMonth.map((m) => ({ ...m, label: monthLabel(m.key) }));
  const last24 = months.slice(-24);
  return (
    <div className="space-y-5">
      {/* 1. KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label={`Recebidas em ${new Date().getFullYear()}`} value={formatInt(k.receivedYear)} accent="green" hint={`${formatInt(k.receivedMonth)} neste mês`} />
        <KpiCard label="Pipe ativo" value={formatInt(k.active)} accent="green" hint={`${formatMM(k.activeVolume, { compact: true })} informado`} />
        <KpiCard label="On Hold" value={formatInt(k.onHold)} accent="amber" />
        <KpiCard label="Concluídas" value={formatInt(k.concluded)} accent="blue" hint={`Conversão ${formatPct(k.conversionRate)}`} />
        <KpiCard label="Declinadas" value={formatInt(k.declined)} accent="red" />
        <KpiCard label="Tempo médio no pipe" value={k.avgDaysInPipeline !== null ? `${Math.round(k.avgDaysInPipeline)}d` : "—"} hint={`Ticket médio ${formatMM(k.avgTicket)} · ${formatInt(k.withAmount)} com valor`} />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <KpiCard label="Volume total recebido (informado)" value={formatMM(k.totalVolume, { compact: true })} hint={`${formatInt(k.total)} oportunidades no período · ${formatInt(k.withAmount)} com valor informado`} className="xl:col-span-1" />
        <Card className="xl:col-span-2 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground w-full">Status atual</div>
          {data.byStatus.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color ?? "#999" }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold tabular">{s.count}</span>
            </div>
          ))}
        </Card>
      </section>

      {/* 2. Temporal evolution */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <ChartCard title="Oportunidades por mês" description="Recebidas e concluídas" period={periodLabel} className="xl:col-span-2" height={280} highlights={[{ label: "Recebidas", value: formatInt(k.total) }, { label: "Concluídas", value: formatInt(k.concluded) }]}>
          <MonthlySeries data={last24} secondaryKey="concluded" />
        </ChartCard>
        <ChartCard title="Funil" description="Com base na evidência disponível no histórico" period={periodLabel} height={280}>
          <Funnel data={data.funnel} />
        </ChartCard>
      </section>

      {/* 3. Pipeline composition */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <ChartCard title="Oportunidades por tipo" period={periodLabel} height={320} highlights={data.byType.slice(0, 2).map((t) => ({ label: t.label, value: formatInt(t.count) }))}>
          <HorizontalBars data={data.byType.slice(0, 12) as unknown as Record<string, unknown>[]} />
        </ChartCard>
        <ChartCard title="Canal de entrada" description="Registrado a partir de novas oportunidades" period={periodLabel} height={320}>
          <Donut data={data.byChannel as unknown as Record<string, unknown>[]} centerValue={formatInt(k.total)} centerLabel="casos" />
        </ChartCard>
        <ChartCard title="Aging do pipe ativo" description="Dias desde a entrada" height={320} highlights={[{ label: "> 90 dias", value: formatInt(data.aging.find((a) => a.key === ">90")?.count ?? 0) }]}>
          <Columns data={data.aging.map((a) => ({ label: a.key, count: a.count })) as unknown as Record<string, unknown>[]} />
        </ChartCard>
      </section>

      {/* 4. Origination */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <ChartCard title="Originação por empresa" description="Top 12" period={periodLabel} height={340}>
          <HorizontalBars data={data.byCompany.slice(0, 12) as unknown as Record<string, unknown>[]} color="#3b6b8f" />
        </ChartCard>
        <ChartCard title="Originação por pessoa" description="Top 12" period={periodLabel} height={340}>
          <HorizontalBars data={data.byContact.slice(0, 12) as unknown as Record<string, unknown>[]} color="#6b4f8f" />
        </ChartCard>
        <ChartCard title="Originação por categoria" description="Banco / Asset / Consultoria / Broker…" period={periodLabel} height={340}>
          <HorizontalBars data={data.byOriginatorCategory as unknown as Record<string, unknown>[]} colorful />
        </ChartCard>
      </section>

      {/* 5. Team */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <ChartCard title="Oportunidades por responsável" period={periodLabel} height={260}>
          <Columns data={data.byAssignee as unknown as Record<string, unknown>[]} colorful angle={-20} />
        </ChartCard>
        <ChartCard title="Casos por ano" period="Todo o histórico filtrado" height={260} highlights={data.byYear.map((y) => ({ label: y.label, value: formatInt(y.count) }))}>
          <Columns data={data.byYear as unknown as Record<string, unknown>[]} />
        </ChartCard>
        <ChartCard title="Conversão por tipo" description="Concluídas / (concluídas + declinadas)" period={periodLabel} height={260}>
          <HorizontalBars
            data={data.byTypeCategory
              .map((t) => ({ label: t.label, count: t.count, rate: t.concluded && t.count ? Math.round(((t.concluded ?? 0) / Math.max(1, t.count)) * 1000) / 10 : 0 }))
              .filter((t) => t.count >= 3)
              .sort((a, b) => b.rate - a.rate)
              .slice(0, 10) as unknown as Record<string, unknown>[]}
            valueKey="rate"
            formatter={(v) => `${v}%`}
            color="#2f6b5a"
          />
        </ChartCard>
      </section>

      {/* 5b. Why we say no */}
      <section className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Motivos de recusa"
          description={`${formatInt(data.declinedTotal)} declinadas · ${formatInt(data.declinedWithoutReason)} sem motivo classificado${data.declineReasons.some((r) => r.inferred) ? " · parte classificada automaticamente a partir do texto da planilha" : ""}`}
          period={periodLabel}
          height={Math.max(220, 36 * data.declineReasons.length + 40)}
          className="xl:col-span-2"
          highlights={data.declineReasons.slice(0, 2).map((r) => ({ label: r.label, value: `${Math.round((r.count / Math.max(1, data.declinedTotal - data.declinedWithoutReason)) * 100)}%` }))}
        >
          <HorizontalBars data={data.declineReasons as unknown as Record<string, unknown>[]} labelKey="short" color="#9a4b4b" />
        </ChartCard>
        <ChartCard title="Quem recusou" description="Leto declinou vs. contraparte recusou ou desistiu" period={periodLabel} height={Math.max(220, 36 * data.declineReasons.length + 40)}>
          <Donut data={data.declinedBy as unknown as Record<string, unknown>[]} centerLabel="declinadas" centerValue={formatInt(data.declinedTotal)} />
        </ChartCard>
      </section>

      {/* 6. Personal */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 text-leto-green-deep" /> Meu pipeline
            </CardTitle>
            <CardDescription>Oportunidades em que {userName.split(" ")[0]} é responsável ({personal.mine.length})</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[380px] overflow-auto scrollbar-thin">
            {!personal.mine.length && <EmptyState title="Nenhuma oportunidade atribuída" description="Atribua-se em uma oportunidade do pipe ativo." className="p-6" />}
            {personal.mine.map((o) => (
              <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{o.name}</div>
                  <div className="text-2xs text-muted-foreground truncate">{[o.operationType?.name, o.nextAction ? `→ ${o.nextAction}` : null].filter(Boolean).join(" · ")}</div>
                </div>
                <StatusBadge name={o.status.name} color={o.status.color} />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" /> Precisa de atenção
              <Badge variant="warning" className="ml-auto">
                {personal.attentionCount}
              </Badge>
            </CardTitle>
            <CardDescription>Follow-up vencido, sem próxima ação, sem atualização ou aguardando informação há muito tempo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[380px] overflow-auto scrollbar-thin">
            {!personal.attention.length && <EmptyState title="Tudo em dia" className="p-6" />}
            {personal.attention.map((a) => (
              <Link key={a.id} href={`/opportunities/${a.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className={cn("text-2xs truncate", a.reason.includes("vencido") ? "text-danger" : "text-muted-foreground")}>{a.reason}</div>
                </div>
                <StatusBadge name={a.statusName} color={a.statusColor} />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-info" /> Próximos follow-ups
            </CardTitle>
            <CardDescription>Ordenados por data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[380px] overflow-auto scrollbar-thin">
            {!personal.followUps.length && <EmptyState title="Nenhum follow-up agendado" description="Defina datas de follow-up no Pipe Ativo." className="p-6" />}
            {personal.followUps.map((f) => {
              const overdue = new Date(f.nextFollowUpAt) < new Date(new Date().toDateString());
              return (
                <Link key={f.id} href={`/opportunities/${f.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-xs">
                  <span className={cn("tabular w-16 shrink-0", overdue ? "text-danger font-semibold" : "text-muted-foreground")}>{formatDate(f.nextFollowUpAt)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{f.name}</div>
                    {f.nextAction && <div className="text-2xs text-muted-foreground truncate">{f.nextAction}</div>}
                  </div>
                  <AssigneeAvatars users={f.assignees} max={2} />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
