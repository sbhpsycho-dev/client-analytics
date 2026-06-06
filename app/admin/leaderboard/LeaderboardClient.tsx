"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

const REFRESH_INTERVAL = 45_000;
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import type { LeaderboardRep } from "@/lib/analytics/sheet-metrics";

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

// ── Types & config ────────────────────────────────────────────────────────────

type Category = "cashCollected" | "dealsClosed" | "callsMade" | "closeRate";

const CATEGORIES: { key: Category; label: string; format: (v: number) => string }[] = [
  { key: "cashCollected", label: "Cash Collected", format: v => `$${(v / 1000).toFixed(1)}k` },
  { key: "dealsClosed",   label: "Deals Closed",   format: v => String(v) },
  { key: "callsMade",     label: "Calls Made",     format: v => String(v) },
  { key: "closeRate",     label: "Close Rate",     format: v => `${v}%` },
];

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(180,210,240,0.05)",
};

const GOLD_CARD: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(30,24,8,0.98) 0%, rgba(20,16,4,0.99) 100%)",
  border: "1px solid rgba(252,211,77,0.18)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(252,211,77,0.08)",
};

const CHART_TOOLTIP = {
  contentStyle: { background: "#0d1828", border: "1px solid rgba(180,210,240,0.12)", borderRadius: 8, fontSize: 12, color: "#dce8f4" },
  cursor: { fill: "rgba(180,210,240,0.04)" },
};

const fmt$ = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{title}</span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────

const PODIUM_CONFIG = [
  { rank: 2, height: "h-20", rankColor: "#94a3b8", label: "2nd" },
  { rank: 1, height: "h-28", rankColor: "#f59e0b", label: "1st", glow: true },
  { rank: 3, height: "h-14", rankColor: "#cd7c54", label: "3rd" },
];

function Podium({ ranked, category }: { ranked: LeaderboardRep[]; category: Category }) {
  if (ranked.length < 3) return null;
  const cat = CATEGORIES.find(c => c.key === category)!;
  return (
    <div className="rounded-xl p-6" style={CARD}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-6 text-center" style={{ color: "#4a6a8a" }}>
        Top Performers · {cat.label}
      </p>
      <div className="flex items-end justify-center gap-4">
        {PODIUM_CONFIG.map(({ rank, height, rankColor, label, glow }) => {
          const rep = ranked[rank - 1];
          const value = rep[category];
          return (
            <div key={rank} className="flex flex-col items-center gap-3 w-28">
              <div className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-lg font-black"
                  style={{
                    background: `${rep.color}25`,
                    border: `2px solid ${rep.color}${glow ? "80" : "45"}`,
                    boxShadow: glow ? `0 0 20px ${rep.color}40` : undefined,
                  }}>{rep.name[0]}</div>
                <p className="text-xs font-bold" style={{ color: "#dce8f4" }}>{rep.name}</p>
                <p className="text-xs font-black tabular-nums" style={{ color: glow ? "#fcd34d" : "#a8bdd4" }}>
                  {cat.format(value)}
                </p>
              </div>
              <div className={`w-full ${height} rounded-t-lg flex items-center justify-center`}
                style={{
                  background: `linear-gradient(180deg, ${rankColor}30 0%, ${rankColor}15 100%)`,
                  border: `1px solid ${rankColor}40`,
                  borderBottom: "none",
                  boxShadow: glow ? `0 -4px 20px ${rankColor}30` : undefined,
                }}>
                <span className="text-lg font-black" style={{ color: rankColor }}>{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leaderboard table ─────────────────────────────────────────────────────────

function LeaderboardTable({ ranked, category }: { ranked: LeaderboardRep[]; category: Category }) {
  const cat = CATEGORIES.find(c => c.key === category)!;
  const secondaryCats = CATEGORIES.filter(c => c.key !== category);
  const rankColors = ["#f59e0b", "#94a3b8", "#cd7c54"];

  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(8,15,28,0.85)", borderBottom: "1px solid rgba(180,210,240,0.08)" }}>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] w-10" style={{ color: "#4a6a8a" }}>#</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Rep</th>
            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#fcd34d" }}>{cat.label}</th>
            {secondaryCats.map(c => (
              <th key={c.key} className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => {
            const rankColor = rankColors[i] ?? "#3a5a7a";
            return (
              <tr key={r.name}
                style={{ borderBottom: i < ranked.length - 1 ? "1px solid rgba(180,210,240,0.05)" : undefined }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.03)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                <td className="px-4 py-4">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black"
                    style={{
                      background: i < 3 ? `${rankColor}20` : "rgba(180,210,240,0.06)",
                      color: rankColor,
                      boxShadow: i === 0 ? "0 0 10px rgba(245,158,11,0.4)" : undefined,
                    }}>{i + 1}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: `${r.color}25`, border: `1px solid ${r.color}45` }}>{r.name[0]}</div>
                    <span className="font-semibold" style={{ color: "#dce8f4" }}>{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-base font-black tabular-nums" style={{ color: "#fcd34d" }}>{cat.format(r[category])}</span>
                </td>
                {secondaryCats.map(c => (
                  <td key={c.key} className="px-4 py-4 text-right">
                    <span className="text-sm tabular-nums" style={{ color: "#7a9ab8" }}>{c.format(r[c.key])}</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Comparison chart ──────────────────────────────────────────────────────────

function ComparisonChart({ ranked, category }: { ranked: LeaderboardRep[]; category: Category }) {
  const cat = CATEGORIES.find(c => c.key === category)!;
  const data = ranked.map(r => ({ name: r.name, value: r[category], color: r.color }));

  return (
    <div className="rounded-xl p-5" style={CARD}>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "#a8bdd4" }}>{cat.label} by rep</p>
      <p className="text-xs mb-4" style={{ color: "#4a6a8a" }}>Ranked highest to lowest</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 50)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 70, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={cat.format} />
          <YAxis type="category" dataKey="name" tick={{ fill: "#7a9ab8", fontSize: 12, fontWeight: 600 }}
            axisLine={false} tickLine={false} width={60} />
          <Tooltip {...CHART_TOOLTIP} formatter={v => [cat.format(Number(v)), cat.label]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="value" position="right" style={{ fill: "#7a9ab8", fontSize: 11, fontWeight: 700 }}
              formatter={(v: unknown) => cat.format(Number(v))} />
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  reps: LeaderboardRep[];
  live: boolean;
  lastFetched: string;
}

export function LeaderboardClient({ reps, live, lastFetched }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("cashCollected");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [router]);

  async function handleReset() {
    if (!window.confirm("Reset all current-month data to zero? This cannot be undone.")) return;
    setResetting(true);
    try {
      await fetch("/api/admin/reset-month", { method: "POST" });
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  const ranked = [...reps].sort((a, b) => b[category] - a[category]);

  const totalCash    = reps.reduce((s, r) => s + r.cashCollected, 0);
  const totalDeals   = reps.reduce((s, r) => s + r.dealsClosed, 0);
  const avgDealSize  = totalDeals > 0 ? Math.round(totalCash / totalDeals) : 0;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#dce8f4" }}>Rep Leaderboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>
            {reps.length} reps · ranked by selected category
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge live={live} lastFetched={lastFetched} />
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: resetting ? "#7a3a3a" : "#f87171",
              cursor: resetting ? "not-allowed" : "pointer",
            }}
          >
            <RotateCcw className="h-3 w-3" />
            {resetting ? "Resetting…" : "Reset Month"}
          </button>
        </div>
      </div>

      {/* Headline */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl p-5 cursor-default transition-all hover:brightness-110"
          style={{ ...GOLD_CARD, borderLeft: "3px solid #fcd34d" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "rgba(252,211,77,0.6)" }}>Total Cash Collected</p>
          <p className="text-4xl font-black tabular-nums" style={{ color: "#fcd34d" }}>{fmt$.format(totalCash)}</p>
          <p className="text-xs mt-1" style={{ color: "rgba(252,211,77,0.4)" }}>across all {reps.length} reps</p>
        </div>
        <div className="rounded-xl p-5 cursor-default transition-all hover:brightness-110"
          style={{ ...CARD, borderLeft: "3px solid rgba(74,122,181,0.6)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "#5a7a9a" }}>Average Deal Size</p>
          <p className="text-4xl font-black tabular-nums" style={{ color: "#dce8f4" }}>{fmt$.format(avgDealSize)}</p>
          <p className="text-xs mt-1" style={{ color: "#3a5a7a" }}>{totalDeals} deals closed total</p>
        </div>
      </div>

      {/* Category selector */}
      <div className="space-y-3">
        <SectionHeader title="Rank by category" />
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(c => {
            const active = category === c.key;
            return (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
                style={{
                  background: active ? "rgba(74,122,181,0.25)" : "rgba(74,122,181,0.06)",
                  border: `1px solid ${active ? "rgba(74,122,181,0.5)" : "rgba(74,122,181,0.12)"}`,
                  color: active ? "#dce8f4" : "#4a6a8a",
                  boxShadow: active ? "0 2px 12px rgba(74,122,181,0.2)" : undefined,
                }}>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <Podium ranked={ranked} category={category} />

      <div className="space-y-3">
        <SectionHeader title="Full ranking" />
        <LeaderboardTable ranked={ranked} category={category} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Comparison" />
        <ComparisonChart ranked={ranked} category={category} />
      </div>

      <div className="pb-2">
        <p className="text-xs text-center" style={{ color: "#2a3f52" }}>
          Leadwell Advisors Analytics Platform &nbsp;·&nbsp; A Stack N Scale managed client
        </p>
      </div>
    </div>
  );
}
