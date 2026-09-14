"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList, ComposedChart } from "recharts";
import { AXIS, GRID, LETO_GREEN, LETO_GREEN_DEEP, colorAt } from "./palette";
import { formatInt, formatMM, truncate } from "@/lib/utils";

const tooltipStyle = { contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 12, boxShadow: "0 8px 24px rgba(15,20,17,0.12)" }, labelStyle: { fontWeight: 600, color: "#0f1411" }, cursor: { fill: "rgba(166,184,90,0.10)" } };

export function HorizontalBars({ data, valueKey = "count", labelKey = "label", color, colorful, formatter = (v: number) => formatInt(v), maxBars, showValues = true }: { data: Record<string, unknown>[]; valueKey?: string; labelKey?: string; color?: string; colorful?: boolean; formatter?: (v: number) => string; maxBars?: number; showValues?: boolean }) {
  const rows = maxBars ? data.slice(0, maxBars) : data;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => formatter(Number(v))} />
        <YAxis type="category" dataKey={labelKey} width={150} tick={{ fontSize: 11, fill: "#0f1411" }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => truncate(String(v), 26)} />
        <Tooltip {...tooltipStyle} formatter={(v) => formatter(Number(v))} />
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} fill={color ?? LETO_GREEN_DEEP} maxBarSize={22}>
          {colorful && rows.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
          {showValues && <LabelList dataKey={valueKey} position="right" style={{ fontSize: 11, fill: AXIS }} formatter={(v: number) => formatter(v)} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars split into stacked series (e.g. who declined per reason). Total shown at the end of each bar. */
export function StackedHorizontalBars({ data, series, labelKey = "label", formatter = (v: number) => formatInt(v) }: { data: Record<string, unknown>[]; series: { key: string; label: string; color: string }[]; labelKey?: string; formatter?: (v: number) => string }) {
  const rows = data.map((d) => ({ ...d, __total: series.reduce((acc, s) => acc + Number(d[s.key] ?? 0), 0) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => formatter(Number(v))} />
        <YAxis type="category" dataKey={labelKey} width={150} tick={{ fontSize: 11, fill: "#0f1411" }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => truncate(String(v), 26)} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [formatter(Number(v)), series.find((s) => s.key === name)?.label ?? String(name)]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => series.find((s) => s.key === v)?.label ?? v} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} maxBarSize={22} radius={i === series.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}>
            {i === series.length - 1 && <LabelList dataKey="__total" position="right" style={{ fontSize: 11, fill: AXIS }} formatter={(v: number) => formatter(v)} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Waterfall: "total" steps are full bars from zero; "delta" steps float from the running level.
 * Negative deltas (leaks) are drawn in red, positive in green, totals in ink/lime.
 */
export function Waterfall({ data, formatter = (v: number) => formatInt(v) }: { data: { label: string; value: number; type: "total" | "delta" }[]; formatter?: (v: number) => string }) {
  let level = 0;
  const rows = data.map((d) => {
    if (d.type === "total") {
      level = d.value;
      return { ...d, base: 0, size: d.value, fill: "#050505", shown: d.value };
    }
    const start = level;
    level = level + d.value;
    return { ...d, base: Math.min(start, level), size: Math.abs(d.value), fill: d.value < 0 ? "#9a4b4b" : LETO_GREEN_DEEP, shown: d.value };
  });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 18, bottom: 28 }} barCategoryGap={10}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" height={44} tickFormatter={(v) => truncate(String(v), 16)} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => formatter(Number(v))} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.04)" }} formatter={(v, name, item) => (name === "size" ? [formatter(Number((item as { payload?: { shown?: number } }).payload?.shown ?? v)), (item as { payload?: { type?: string } }).payload?.type === "total" ? "Total" : "Variação"] : [null, null])} />
        <Bar dataKey="base" stackId="w" fill="#ffffff" fillOpacity={0} stroke="none" isAnimationActive={false} />
        <Bar dataKey="size" stackId="w" maxBarSize={36} radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => <Cell key={i} fill={r.fill} />)}
          <LabelList dataKey="shown" position="top" style={{ fontSize: 10, fill: AXIS }} formatter={(v: number) => (v > 0 && rows.find((r) => r.shown === v)?.type === "delta" ? `+${formatter(v)}` : formatter(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Columns({ data, valueKey = "count", labelKey = "label", color, colorful, formatter = (v: number) => formatInt(v), showValues = true, angle = 0 }: { data: Record<string, unknown>[]; valueKey?: string; labelKey?: string; color?: string; colorful?: boolean; formatter?: (v: number) => string; showValues?: boolean; angle?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 16, bottom: angle ? 24 : 4 }} barCategoryGap={8}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} interval={0} angle={angle} textAnchor={angle ? "end" : "middle"} height={angle ? 50 : 30} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => formatter(Number(v))} />
        <Tooltip {...tooltipStyle} formatter={(v) => formatter(Number(v))} />
        <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} fill={color ?? LETO_GREEN_DEEP} maxBarSize={40}>
          {colorful && data.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
          {showValues && <LabelList dataKey={valueKey} position="top" style={{ fontSize: 10, fill: AXIS }} formatter={(v: number) => formatter(v)} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlySeries({ data, secondaryKey, secondaryLabel = "Concluídas" }: { data: { label: string; count: number; concluded?: number; volume?: number }[]; secondaryKey?: "concluded" | "volume"; secondaryLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} interval={data.length > 18 ? Math.ceil(data.length / 12) - 1 : 0} />
        <YAxis yAxisId="l" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        {secondaryKey === "volume" && <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${v}`} />}
        <Tooltip {...tooltipStyle} formatter={(v, name) => (name === "Volume (R$ mm)" ? formatMM(Number(v)) : formatInt(Number(v)))} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        <Bar yAxisId="l" dataKey="count" name="Recebidas" fill={LETO_GREEN} radius={[3, 3, 0, 0]} maxBarSize={28}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: AXIS }} />
        </Bar>
        {secondaryKey === "concluded" && <Line yAxisId="l" type="monotone" dataKey="concluded" name={secondaryLabel} stroke={LETO_GREEN_DEEP} strokeWidth={2} dot={{ r: 2.5 }} />}
        {secondaryKey === "volume" && <Line yAxisId="r" type="monotone" dataKey="volume" name="Volume (R$ mm)" stroke="#3b6b8f" strokeWidth={2} dot={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, keys }: { data: Record<string, unknown>[]; keys: { key: string; label: string; color?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        {keys.map((k, i) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color ?? colorAt(i)} strokeWidth={2} dot={{ r: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, valueKey = "count", labelKey = "label", centerLabel, centerValue }: { data: Record<string, unknown>[]; valueKey?: string; labelKey?: string; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((n, d) => n + Number(d[valueKey] ?? 0), 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, bottom: 4 }}>
        <Pie data={data} dataKey={valueKey} nameKey={labelKey} innerRadius="58%" outerRadius="85%" paddingAngle={1.5} stroke="#fff" strokeWidth={1}>
          {data.map((d, i) => (
            <Cell key={i} fill={(d.color as string) || colorAt(i)} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v) => `${formatInt(Number(v))} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`} />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, maxWidth: 160 }} iconType="circle" iconSize={8} />
        {centerValue && (
          <text x="38%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 22, fontWeight: 600, fill: "#0f1411" }}>
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x="38%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: AXIS, textTransform: "uppercase", letterSpacing: 1 }}>
            {centerLabel}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Funnel({ data }: { data: { stage: string; count: number; note?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex flex-col justify-center gap-2 h-full">
      {data.map((d, i) => {
        const pct = d.count / max;
        const prev = i > 0 ? data[i - 1].count : null;
        const conv = prev ? Math.round((d.count / prev) * 100) : null;
        return (
          <div key={d.stage} className="flex items-center gap-3" title={d.note}>
            <div className="w-36 text-xs text-right text-muted-foreground shrink-0">{d.stage}</div>
            <div className="flex-1 h-7 bg-muted/40 rounded overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width: `${Math.max(pct * 100, 1.5)}%`, backgroundColor: colorAt(i === 0 ? 0 : 1), opacity: 1 - i * 0.12 }} />
            </div>
            <div className="w-10 text-xs font-semibold tabular shrink-0 text-right">{d.count}</div>
            <div className="w-12 text-2xs text-muted-foreground tabular shrink-0">{conv !== null ? `${conv}%` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}
