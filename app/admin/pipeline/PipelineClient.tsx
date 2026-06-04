"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PipelineRep } from "@/lib/analytics/sheet-metrics";

const REFRESH_INTERVAL = 45_000;

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ live, lastFetched }: { live: boolean; lastFetched: string }) {
  if (live) {
    const mins = Math.round((Date.now() - new Date(lastFetched).getTime()) / 60_000);
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
        style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        Live · {mins < 1 ? "just now" : `${mins}m ago`}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
      style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      Sample data · set GOOGLE_SHEETS_API_KEY to connect
    </span>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(180,210,240,0.05)",
};

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{title}</span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

function rateColor(rate: number, teamAvg: number) {
  if (rate > teamAvg + 3) return "#4ade80";
  if (rate < teamAvg - 3) return "#f87171";
  return "#dce8f4";
}

// ── Components ────────────────────────────────────────────────────────────────

function FunnelChart({ totals }: { totals: ReturnType<typeof computeTotals> }) {
  const max = totals.callsMade || 1;
  const FUNNEL_COLORS = ["#3B6FB5", "#2a7aa8", "#1D9E8a", "#28b077", "#c8a520", "#fcd34d"];

  const stages = [
    { label: "Calls Made",     value: totals.callsMade,     prev: null },
    { label: "Calls Answered", value: totals.callsAnswered, prev: totals.callsMade },
    { label: "Demos Set",      value: totals.demosSet,      prev: totals.callsAnswered },
    { label: "Demos Showed",   value: totals.demosShowed,   prev: totals.demosSet },
    { label: "Pitched",        value: totals.pitched,       prev: totals.demosShowed },
    { label: "Closed",         value: totals.closed,        prev: totals.pitched },
  ];

  return (
    <div className="rounded-xl p-6 space-y-2" style={CARD}>
      {stages.map((stage, i) => {
        const widthPct = (stage.value / max) * 100;
        const convPct = stage.prev !== null ? pct(stage.value, stage.prev) : null;
        const color = FUNNEL_COLORS[i];
        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "#7a9ab8" }}>{stage.label}</span>
              <div className="flex items-center gap-3">
                {convPct !== null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      background: convPct >= 50 ? "rgba(74,222,128,0.1)" : convPct >= 30 ? "rgba(252,211,77,0.1)" : "rgba(248,113,113,0.1)",
                      color: convPct >= 50 ? "#4ade80" : convPct >= 30 ? "#fcd34d" : "#f87171",
                    }}>
                    {convPct}% from prev
                  </span>
                )}
                <span className="text-sm font-black tabular-nums w-10 text-right" style={{ color: "#dce8f4" }}>
                  {stage.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-8 rounded-lg overflow-hidden" style={{ background: "rgba(180,210,240,0.05)" }}>
              <div className="h-full rounded-lg transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${color}80 0%, ${color} 100%)`,
                  boxShadow: `0 0 12px ${color}40`,
                  minWidth: "2.5rem",
                }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatePills({ totals }: { totals: ReturnType<typeof computeTotals> }) {
  const rates = [
    { label: "Answer Rate",  value: pct(totals.callsAnswered, totals.callsMade),  threshold: 60 },
    { label: "Show Rate",    value: pct(totals.demosShowed,   totals.demosSet),   threshold: 65 },
    { label: "Close Rate",   value: pct(totals.closed,        totals.pitched),    threshold: 25 },
    { label: "Demo → Close", value: pct(totals.closed,        totals.demosSet),   threshold: 15 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {rates.map(({ label, value, threshold }) => {
        const good = value >= threshold;
        const warn = value >= threshold * 0.85;
        const color = good ? "#4ade80" : warn ? "#fcd34d" : "#f87171";
        const bg    = good ? "rgba(74,222,128,0.08)" : warn ? "rgba(252,211,77,0.08)" : "rgba(248,113,113,0.08)";
        const border= good ? "rgba(74,222,128,0.2)"  : warn ? "rgba(252,211,77,0.2)"  : "rgba(248,113,113,0.2)";
        return (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: `${color}99` }}>{label}</p>
            <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}%</p>
          </div>
        );
      })}
    </div>
  );
}

function RepTable({ reps, totals, teamRates }: {
  reps: PipelineRep[];
  totals: ReturnType<typeof computeTotals>;
  teamRates: ReturnType<typeof computeTeamRates>;
}) {
  const cols = [
    { key: "callsMade",     label: "Calls Made",   rate: false },
    { key: "callsAnswered", label: "Answered",      rate: false },
    { key: "answerRate",    label: "Answer %",      rate: true,  avg: teamRates.answerRate },
    { key: "demosSet",      label: "Demos Set",     rate: false },
    { key: "demosShowed",   label: "Showed",        rate: false },
    { key: "showRate",      label: "Show %",        rate: true,  avg: teamRates.showRate },
    { key: "pitched",       label: "Pitched",       rate: false },
    { key: "closed",        label: "Closed",        rate: false },
    { key: "closeRate",     label: "Close %",       rate: true,  avg: teamRates.closeRate },
    { key: "demoToClose",   label: "Demo→Close%",   rate: true,  avg: teamRates.demoToClose },
  ] as const;

  const rows = reps.map(r => ({
    ...r,
    answerRate:  pct(r.callsAnswered, r.callsMade),
    showRate:    pct(r.demosShowed,   r.demosSet),
    closeRate:   pct(r.closed,        r.pitched),
    demoToClose: pct(r.closed,        r.demosSet),
  }));

  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(8,15,28,0.85)", borderBottom: "1px solid rgba(180,210,240,0.08)" }}>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Rep</th>
            {cols.map(c => (
              <th key={c.key} className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: c.rate ? "rgba(74,122,181,0.8)" : "#4a6a8a" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.name}
              style={{ borderBottom: "1px solid rgba(180,210,240,0.05)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: `${r.color}25`, border: `1px solid ${r.color}40` }}>{r.name[0]}</div>
                  <span className="font-semibold" style={{ color: "#dce8f4" }}>{r.name}</span>
                </div>
              </td>
              {cols.map(c => {
                const val = r[c.key as keyof typeof r] as number;
                const color = c.rate ? rateColor(val, (c as { avg?: number }).avg ?? 50) : "#dce8f4";
                return (
                  <td key={c.key} className="px-3 py-3 text-right">
                    <span className="font-bold tabular-nums" style={{ color }}>
                      {c.rate ? `${val}%` : val.toLocaleString()}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Totals row */}
          <tr style={{ background: "rgba(74,122,181,0.06)", borderTop: "2px solid rgba(74,122,181,0.15)" }}>
            <td className="px-4 py-3">
              <span className="text-xs font-black uppercase tracking-wide" style={{ color: "#4a7ab5" }}>Team Total</span>
            </td>
            {cols.map(c => {
              const val = c.key === "answerRate"  ? teamRates.answerRate  :
                          c.key === "showRate"    ? teamRates.showRate    :
                          c.key === "closeRate"   ? teamRates.closeRate   :
                          c.key === "demoToClose" ? teamRates.demoToClose :
                          totals[c.key as keyof typeof totals];
              return (
                <td key={c.key} className="px-3 py-3 text-right">
                  <span className="font-bold tabular-nums" style={{ color: c.rate ? "#7a9ab8" : "#dce8f4" }}>
                    {c.rate ? `${val}%` : (val as number).toLocaleString()}
                  </span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeTotals(reps: PipelineRep[]) {
  return reps.reduce(
    (acc, r) => ({
      callsMade:     acc.callsMade     + r.callsMade,
      callsAnswered: acc.callsAnswered + r.callsAnswered,
      demosSet:      acc.demosSet      + r.demosSet,
      demosShowed:   acc.demosShowed   + r.demosShowed,
      pitched:       acc.pitched       + r.pitched,
      closed:        acc.closed        + r.closed,
    }),
    { callsMade: 0, callsAnswered: 0, demosSet: 0, demosShowed: 0, pitched: 0, closed: 0 }
  );
}

function computeTeamRates(totals: ReturnType<typeof computeTotals>) {
  return {
    answerRate:  pct(totals.callsAnswered, totals.callsMade),
    showRate:    pct(totals.demosShowed,   totals.demosSet),
    closeRate:   pct(totals.closed,        totals.pitched),
    demoToClose: pct(totals.closed,        totals.demosSet),
  };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  reps: PipelineRep[];
  live: boolean;
  lastFetched: string;
}

export function PipelineClient({ reps, live, lastFetched }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [router]);

  const totals    = computeTotals(reps);
  const teamRates = computeTeamRates(totals);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#dce8f4" }}>Pipeline</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>
            Team funnel · {totals.callsMade.toLocaleString()} calls → {totals.closed} closed
          </p>
        </div>
        <StatusBadge live={live} lastFetched={lastFetched} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Funnel" />
        <FunnelChart totals={totals} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Key rates" />
        <RatePills totals={totals} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Per-rep breakdown" />
        <p className="text-xs" style={{ color: "#3a5a7a" }}>
          Rate columns are highlighted <span style={{ color: "#4ade80" }}>green</span> when above team average and <span style={{ color: "#f87171" }}>red</span> when below.
        </p>
        <RepTable reps={reps} totals={totals} teamRates={teamRates} />
      </div>

      <div className="pb-2">
        <p className="text-xs text-center" style={{ color: "#2a3f52" }}>
          Leadwell Advisors Analytics Platform &nbsp;·&nbsp; A Stack N Scale managed client
        </p>
      </div>
    </div>
  );
}
