"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowRight, ChevronRight } from "lucide-react";
import { MOCK, TEAM_ROSTER, PERIOD_LABELS, type Period, type KpiValue } from "./mockData";

// ─── Shared design tokens ─────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(180,210,240,0.05)",
};

const fmt$ = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0d1828",
    border: "1px solid rgba(180,210,240,0.12)",
    borderRadius: 8,
    fontSize: 12,
    color: "#dce8f4",
  },
  cursor: { stroke: "rgba(180,210,240,0.1)", strokeWidth: 1 },
};

// ─── Primitive helpers ────────────────────────────────────────────────────────

function Delta({ kpi, unit }: { kpi: KpiValue; unit?: string }) {
  if (kpi.delta === null) return null;
  const isUp = kpi.delta > 0;
  const isDown = kpi.delta < 0;
  const color = isUp ? "#4ade80" : isDown ? "#f87171" : "#7a9ab8";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const label = kpi.unit === "usd"
    ? `${isUp ? "+" : ""}${kpi.delta.toFixed(1)}%`
    : kpi.unit === "count"
    ? `${isUp ? "+" : ""}${kpi.delta} vs last mo`
    : `${isUp ? "+" : ""}${Math.abs(kpi.delta).toFixed(1)} pts`;
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color }}>
      <Icon className="h-3 w-3" />
      {isDown && kpi.unit !== "usd" ? `-${Math.abs(kpi.delta).toFixed(1)} pts` : label}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(180,210,240,0.08)" }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(value, 100)}%`,
          background: `linear-gradient(90deg, ${color}80 0%, ${color} 100%)`,
          boxShadow: `0 0 6px ${color}50`,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function formatValue(kpi: KpiValue): string {
  if (kpi.unit === "usd") return fmt$.format(kpi.value);
  if (kpi.unit === "pct") return `${kpi.value}%`;
  return kpi.value.toLocaleString();
}

// ─── KPI Card (for detail views) ─────────────────────────────────────────────

function KpiCard({ label, kpi, accentColor }: { label: string; kpi: KpiValue; accentColor: string }) {
  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 hover:brightness-110"
      style={{
        ...CARD,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: `${accentColor}cc` }}>
        {label}
      </p>
      <p className="text-3xl font-black tabular-nums leading-none" style={{ color: "#dce8f4" }}>
        {formatValue(kpi)}
      </p>
      {kpi.unit === "pct" && <ProgressBar value={kpi.value} color={accentColor} />}
      <div className="mt-2.5">
        <Delta kpi={kpi} />
      </div>
    </div>
  );
}

// ─── Sample data banner ───────────────────────────────────────────────────────

function SampleBanner() {
  return (
    <div
      className="rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2"
      style={{
        background: "rgba(120,80,10,0.2)",
        border: "1px solid rgba(245,158,11,0.25)",
        color: "#fcd34d",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
      Sample data — placeholders until your CRM data is wired in
    </div>
  );
}

// ─── Person header (for detail views) ────────────────────────────────────────

function PersonHeader({ name, role, color, subtitle }: { name: string; role: string; color: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
        style={{
          background: `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`,
          border: `2px solid ${color}50`,
          boxShadow: `0 0 20px ${color}20`,
        }}
      >
        {name[0]}
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{name}</h2>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
            style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}
          >
            {role}
          </span>
          {subtitle && <span className="text-xs" style={{ color: "#4a6a8a" }}>{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{title}</span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

// ─── Chart wrappers ───────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={CARD}>
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: "#a8bdd4" }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── OVERVIEW VIEW ────────────────────────────────────────────────────────────

function OverviewView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const kpis: { label: string; key: keyof typeof MOCK.overview }[] = [
    { label: "Team Close Rate",      key: "teamCloseRate" },
    { label: "Team Show-Up Rate",    key: "teamShowUpRate" },
    { label: "Customer Retention",   key: "customerRetention" },
    { label: "Appointments Booked",  key: "appointmentsBooked" },
    { label: "Team Conversion Rate", key: "teamConversionRate" },
    { label: "Average Deal Size",    key: "avgDealSize" },
    { label: "Training Completion",  key: "trainingCompletion" },
    { label: "Onboarding Completion",key: "onboardingCompletion" },
  ];

  return (
    <div className="space-y-8">
      <SampleBanner />

      {/* Headline KPI tiles */}
      <div className="space-y-3">
        <SectionHeader title="Team headline metrics this month" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map(({ label, key }) => {
            const kpi = MOCK.overview[key];
            const isUp = kpi.delta !== null && kpi.delta > 0;
            const isDown = kpi.delta !== null && kpi.delta < 0;
            const fmtVal = formatValue(kpi);
            return (
              <div
                key={key}
                className="rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
                style={CARD}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: "#5a7a9a" }}>
                  {label}
                </p>
                <p className="text-2xl font-black tabular-nums leading-none text-white">{fmtVal}</p>
                {kpi.unit === "pct" && (
                  <ProgressBar value={kpi.value} color={isDown ? "#f87171" : isUp ? "#4ade80" : "#4a7ab5"} />
                )}
                <div className="mt-2">
                  {kpi.delta !== null && (
                    <span
                      className="flex items-center gap-0.5 text-[11px] font-semibold"
                      style={{ color: isUp ? "#4ade80" : isDown ? "#f87171" : "#7a9ab8" }}
                    >
                      {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {kpi.unit === "count"
                        ? `+${kpi.delta} vs last mo`
                        : kpi.unit === "usd"
                        ? `+${kpi.delta}%`
                        : `${isUp ? "+" : ""}${Math.abs(kpi.delta).toFixed(1)} pts`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role summary cards */}
      <div className="space-y-3">
        <SectionHeader title="By role — click a card to drill in" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Sales Director */}
          <button
            onClick={() => onNavigate("director")}
            className="rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:brightness-110 group"
            style={{ ...CARD, borderTop: `3px solid ${TEAM_ROSTER.director.color}` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: `${TEAM_ROSTER.director.color}30`, border: `1px solid ${TEAM_ROSTER.director.color}50` }}
              >
                H
              </div>
              <div>
                <p className="font-bold text-white text-sm">Sales Director</p>
                <p className="text-[11px]" style={{ color: "#4a6a8a" }}>Harneet · 1 person</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {[
                ["Team Close Rate", "32%"],
                ["Show-Up Rate", "71%"],
                ["Avg Deal Size", "$6,290"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid rgba(180,210,240,0.06)" }}>
                  <span className="text-xs" style={{ color: "#7a9ab8" }}>{l}</span>
                  <span className="text-xs font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: TEAM_ROSTER.director.color }}>
              View detail <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          {/* Setters */}
          <button
            onClick={() => onNavigate("setters")}
            className="rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:brightness-110 group"
            style={{ ...CARD, borderTop: "3px solid #1D9E75" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: "rgba(29,158,117,0.2)", border: "1px solid rgba(29,158,117,0.4)" }}
              >
                3
              </div>
              <div>
                <p className="font-bold text-white text-sm">Setters</p>
                <p className="text-[11px]" style={{ color: "#4a6a8a" }}>Sylis · Izaiah · Celest</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {[
                ["Appointments", "103"],
                ["Avg Show Rate", "71%"],
                ["Avg Conversion", "29%"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid rgba(180,210,240,0.06)" }}>
                  <span className="text-xs" style={{ color: "#7a9ab8" }}>{l}</span>
                  <span className="text-xs font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#1D9E75" }}>
              View detail <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          {/* VA & Ops */}
          <button
            onClick={() => onNavigate("va")}
            className="rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:brightness-110 group"
            style={{ ...CARD, borderTop: `3px solid ${TEAM_ROSTER.va.color}` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: `${TEAM_ROSTER.va.color}25`, border: `1px solid ${TEAM_ROSTER.va.color}45` }}
              >
                C
              </div>
              <div>
                <p className="font-bold text-white text-sm">VA & Ops</p>
                <p className="text-[11px]" style={{ color: "#4a6a8a" }}>Chona · 1 person</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {[
                ["Contract Completion", "91%"],
                ["Student Response", "78%"],
                ["Onboarding", "86%"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid rgba(180,210,240,0.06)" }}>
                  <span className="text-xs" style={{ color: "#7a9ab8" }}>{l}</span>
                  <span className="text-xs font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: TEAM_ROSTER.va.color }}>
              View detail <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Setter Output" subtitle="Appointments booked by setter · last 6 weeks">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK.trends} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#7a9ab8", paddingTop: 8 }} />
              <Bar dataKey="sylis"  name="Sylis"  fill="#1D9E75" radius={[3,3,0,0]} />
              <Bar dataKey="izaiah" name="Izaiah" fill="#D8843A" radius={[3,3,0,0]} />
              <Bar dataKey="celest" name="Celest" fill="#D957A8" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Team Close Rate" subtitle="Last 6 weeks">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK.trends} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} domain={[20, 40]} unit="%" />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Close Rate"]} />
              <Line type="monotone" dataKey="closeRate" stroke="#3B6FB5" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#3B6FB5" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── SALES DIRECTOR VIEW ──────────────────────────────────────────────────────

function DirectorView() {
  const d = MOCK.director;
  const c = TEAM_ROSTER.director.color;

  const kpis: { label: string; kpi: KpiValue }[] = [
    { label: "Team Show-Up Rate",      kpi: d.showUpRate },
    { label: "Team Close Rate",        kpi: d.closeRate },
    { label: "Customer Retention Rate",kpi: d.customerRetention },
    { label: "Training Completion Rate",kpi: d.trainingCompletion },
    { label: "Average Deal Size",      kpi: d.avgDealSize },
  ];

  return (
    <div className="space-y-8">
      <SampleBanner />
      <PersonHeader name="Harneet" role="Sales Director" color={c} subtitle="LeadWell leadership KPIs" />

      {/* KPI cards */}
      <div className="space-y-3">
        <SectionHeader title="KPI scorecard" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map(({ label, kpi }) => (
            <KpiCard key={label} label={label} kpi={kpi} accentColor={c} />
          ))}
        </div>
      </div>

      {/* Trend charts */}
      <div className="space-y-3">
        <SectionHeader title="Trends · last 6 weeks" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Close Rate vs Show-Up Rate" subtitle="6-week comparison">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MOCK.trends} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, name) => [`${v}%`, name === "closeRate" ? "Close Rate" : "Show-Up Rate"]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#7a9ab8", paddingTop: 8 }} formatter={(v) => v === "closeRate" ? "Close Rate" : "Show-Up Rate"} />
                <Line type="monotone" dataKey="closeRate"  stroke={c}       strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="showUpRate" stroke="#4ade80" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Average Deal Size" subtitle="Last 6 weeks">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MOCK.trends} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [fmt$.format(Number(v)), "Avg Deal Size"]} />
                <Line type="monotone" dataKey="avgDealSize" stroke="#fcd34d" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#fcd34d" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ─── SETTERS VIEW ─────────────────────────────────────────────────────────────

function SettersView() {
  const setters = MOCK.setters;

  const leaderboardCols = [
    { key: "contactRate" as const,         label: "Contact Rate" },
    { key: "appointmentsBooked" as const,  label: "Appts Booked" },
    { key: "showRate" as const,            label: "Show Rate" },
    { key: "conversionRate" as const,      label: "Conversion" },
  ];

  // Rank setters by total appointments
  const ranked = [...setters].sort((a, b) => b.appointmentsBooked.value - a.appointmentsBooked.value);

  return (
    <div className="space-y-8">
      <SampleBanner />

      {/* Leaderboard table */}
      <div className="space-y-3">
        <SectionHeader title="Leaderboard" />
        <div className="rounded-xl overflow-hidden" style={CARD}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(180,210,240,0.08)", background: "rgba(13,24,40,0.6)" }}>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>#</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Setter</th>
                {leaderboardCols.map(c => (
                  <th key={c.key} className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => (
                <tr
                  key={s.name}
                  style={{ borderBottom: i < ranked.length - 1 ? "1px solid rgba(180,210,240,0.05)" : undefined }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.03)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: i === 0 ? "rgba(245,158,11,0.2)" : i === 1 ? "rgba(148,163,184,0.15)" : "rgba(205,124,84,0.15)",
                        color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#cd7c54",
                      }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `${s.color}25`, border: `1px solid ${s.color}40` }}
                      >
                        {s.name[0]}
                      </div>
                      <span className="font-semibold text-white">{s.name}</span>
                    </div>
                  </td>
                  {leaderboardCols.map(c => {
                    const kpi = s[c.key];
                    const isUp = kpi.delta !== null && kpi.delta > 0;
                    const isDown = kpi.delta !== null && kpi.delta < 0;
                    return (
                      <td key={c.key} className="px-4 py-3.5 text-right">
                        <span className="font-bold" style={{ color: "#dce8f4" }}>{formatValue(kpi)}</span>
                        {kpi.delta !== null && (
                          <span
                            className="ml-1.5 text-[10px] font-semibold"
                            style={{ color: isUp ? "#4ade80" : isDown ? "#f87171" : "#7a9ab8" }}
                          >
                            {isUp ? "▲" : isDown ? "▼" : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison chart */}
      <div className="space-y-3">
        <SectionHeader title="Rate comparison" />
        <ChartCard title="Contact · Show · Conversion by setter" subtitle="This period">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={setters.map(s => ({
                name: s.name,
                "Contact Rate": s.contactRate.value,
                "Show Rate": s.showRate.value,
                "Conversion": s.conversionRate.value,
                color: s.color,
              }))}
              margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#7a9ab8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, name) => [`${v}%`, String(name)]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#7a9ab8", paddingTop: 8 }} />
              <Bar dataKey="Contact Rate" fill="#4a7ab5" radius={[3,3,0,0]} />
              <Bar dataKey="Show Rate"    fill="#34d399" radius={[3,3,0,0]} />
              <Bar dataKey="Conversion"  fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Individual breakdowns */}
      <div className="space-y-3">
        <SectionHeader title="Individual breakdown" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {setters.map(s => (
            <div key={s.name} className="rounded-xl overflow-hidden" style={CARD}>
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(180,210,240,0.07)" }}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: `${s.color}25`, border: `1px solid ${s.color}40` }}
                >
                  {s.name[0]}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{s.name}</p>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: `${s.color}20`, color: s.color }}
                  >
                    Setter
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: "Contact Rate",        kpi: s.contactRate },
                  { label: "Appointments Booked", kpi: s.appointmentsBooked },
                  { label: "Show Rate",           kpi: s.showRate },
                  { label: "Conversion Rate",     kpi: s.conversionRate },
                ].map(({ label, kpi }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px]" style={{ color: "#6a8aaa" }}>{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: "#dce8f4" }}>{formatValue(kpi)}</span>
                        <Delta kpi={kpi} />
                      </div>
                    </div>
                    {kpi.unit === "pct" && <ProgressBar value={kpi.value} color={s.color} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VA & OPS VIEW ────────────────────────────────────────────────────────────

function VAView() {
  const va = MOCK.va;
  const c = TEAM_ROSTER.va.color;

  const kpis: { label: string; kpi: KpiValue }[] = [
    { label: "Student Contract Completion", kpi: va.contractCompletion },
    { label: "Mastermind Attendance Rate",  kpi: va.mastermindAttendance },
    { label: "Tuesday Reminder Completion", kpi: va.tuesdayReminder },
    { label: "Student Response Rate",       kpi: va.studentResponse },
    { label: "Onboarding Completion Rate",  kpi: va.onboardingCompletion },
  ];

  return (
    <div className="space-y-8">
      <SampleBanner />
      <PersonHeader name="Chona" role="VA & Ops" color={c} subtitle="Student success & operations" />

      {/* KPI cards */}
      <div className="space-y-3">
        <SectionHeader title="KPI scorecard" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map(({ label, kpi }) => (
            <KpiCard key={label} label={label} kpi={kpi} accentColor={c} />
          ))}
        </div>
      </div>

      {/* Trend chart */}
      <div className="space-y-3">
        <SectionHeader title="Student Response Rate trend" />
        <ChartCard title="Student Response Rate" subtitle="Last 6 weeks">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK.trends} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[60, 90]} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Student Response"]} />
              <Line type="monotone" dataKey="studentResponse" stroke={c} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: c }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Sub-navigation ───────────────────────────────────────────────────────────

type ViewKey = "overview" | "director" | "setters" | "va";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "overview",  label: "Overview" },
  { key: "director",  label: "Sales Director" },
  { key: "setters",   label: "Setters" },
  { key: "va",        label: "VA & Ops" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d",  label: "7D" },
  { key: "mtd", label: "MTD" },
  { key: "qtd", label: "QTD" },
  { key: "ytd", label: "YTD" },
];

// ─── Main export ──────────────────────────────────────────────────────────────

interface TrackersClientProps {
  initialView: ViewKey;
  initialPeriod: Period;
  tenantSlug: string;
  brandColor: string;
}

export function TrackersClient({ initialView, initialPeriod, tenantSlug, brandColor }: TrackersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = (searchParams.get("view") ?? initialView) as ViewKey;
  const period = (searchParams.get("period") ?? initialPeriod) as Period;

  function navigate(newView: ViewKey, newPeriod?: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    if (newPeriod) params.set("period", newPeriod);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col h-full">

      {/* Sub-nav bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0 gap-4 flex-wrap"
        style={{ borderBottom: "1px solid rgba(180,210,240,0.08)", background: "rgba(8,15,28,0.5)" }}
      >
        {/* View tabs */}
        <div className="flex items-center gap-1">
          {VIEWS.map(({ key, label }) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => navigate(key)}
                className="relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? `${brandColor}20` : "transparent",
                  color: active ? "#dce8f4" : "#3a5a7a",
                  border: active ? `1px solid ${brandColor}35` : "1px solid transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Period toggle */}
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: "rgba(13,24,40,0.8)", border: "1px solid rgba(180,210,240,0.08)" }}
        >
          {PERIODS.map(({ key, label }) => {
            const active = period === key;
            return (
              <button
                key={key}
                onClick={() => navigate(view, key)}
                className="px-3 py-1 rounded-md text-xs font-bold transition-all duration-150"
                style={active ? {
                  background: `linear-gradient(135deg, ${brandColor}45 0%, ${brandColor}25 100%)`,
                  color: "#dce8f4",
                  border: `1px solid ${brandColor}40`,
                } : {
                  color: "#3a5a7a",
                  border: "1px solid transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2 max-w-[1400px]">

        {/* View title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">
            {view === "overview" ? "Team Performance Overview" :
             view === "director" ? "Sales Director" :
             view === "setters" ? "Setters" :
             "VA & Ops"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>
            Team KPI scorecard &nbsp;·&nbsp; {PERIOD_LABELS[period]}
          </p>
        </div>

        {view === "overview"  && <OverviewView onNavigate={(v) => navigate(v as ViewKey)} />}
        {view === "director"  && <DirectorView />}
        {view === "setters"   && <SettersView />}
        {view === "va"        && <VAView />}

        {/* Footer */}
        <div className="pt-8 pb-2">
          <p className="text-xs text-center" style={{ color: "#2a3f52" }}>
            A Stack N Scale managed client &nbsp;·&nbsp; Leadwell Advisors Analytics Platform
          </p>
        </div>

      </div>
    </div>
  );
}
