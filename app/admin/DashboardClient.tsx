"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  XAxis, YAxis, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Clock, AlertTriangle, BarChart3, Minus } from "lucide-react";
import type { DashboardMetrics } from "@/lib/analytics/sheet-metrics";

const REFRESH_INTERVAL = 45_000; // 45 seconds

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ live, lastFetched, countdown }: { live: boolean; lastFetched: string; countdown: number }) {
  if (live) {
    const mins = Math.round((Date.now() - new Date(lastFetched).getTime()) / 60_000);
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
        style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        Live · {mins < 1 ? "just now" : `${mins}m ago`} · refreshing in {countdown}s
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
      style={{ background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      Sample data · refreshing in {countdown}s
    </span>
  );
}

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
  cursor: { stroke: "rgba(180,210,240,0.1)", strokeWidth: 1 },
};

const fmt$ = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{title}</span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

function DeltaBadge({ delta, invert = false, isCount = false }: { delta: number; invert?: boolean; isCount?: boolean }) {
  const good = invert ? delta < 0 : delta > 0;
  const color = delta === 0 ? "#7a9ab8" : good ? "#4ade80" : "#f87171";
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const label = isCount
    ? `${delta > 0 ? "+" : ""}${delta} vs last mo`
    : `${delta > 0 ? "+" : ""}${delta}%`;
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color }}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={pts} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MetricTile({ label, value, delta, invertDelta = false, isCountDelta = false, large = false, gold = false, red = false, icon: Icon }: {
  label: string; value: string; delta?: number; invertDelta?: boolean; isCountDelta?: boolean;
  large?: boolean; gold?: boolean; red?: boolean; icon?: React.ElementType;
}) {
  const accentColor = gold ? "#fcd34d" : red ? "#f87171" : "rgba(74,122,181,0.6)";
  return (
    <div className="rounded-xl p-5 transition-all duration-200 hover:brightness-110 cursor-default"
      style={{ ...(gold ? GOLD_CARD : CARD), borderLeft: `3px solid ${accentColor}` }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: gold ? "rgba(252,211,77,0.6)" : red ? "rgba(248,113,113,0.6)" : "#5a7a9a" }}>{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: gold ? "rgba(252,211,77,0.35)" : red ? "rgba(248,113,113,0.35)" : "rgba(74,122,181,0.35)" }} />}
      </div>
      <p className={`font-black tabular-nums leading-none ${large ? "text-4xl" : "text-2xl"}`}
        style={{ color: gold ? "#fcd34d" : red ? "#f87171" : "#dce8f4" }}>{value}</p>
      {delta !== undefined && (
        <div className="mt-2.5">
          <DeltaBadge delta={delta} invert={invertDelta} isCount={isCountDelta} />
        </div>
      )}
    </div>
  );
}

function MrrTile({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="rounded-xl p-5 transition-all duration-200 hover:brightness-110 cursor-default"
      style={{ ...CARD, borderLeft: "3px solid rgba(74,122,181,0.6)" }}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "#5a7a9a" }}>MRR</p>
        <BarChart3 className="h-4 w-4 shrink-0" style={{ color: "rgba(74,122,181,0.35)" }} />
      </div>
      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: "#dce8f4" }}>
        {fmt$.format(metrics.mrr)}
      </p>
      <div className="my-1"><Sparkline data={metrics.mrrTrend} color="#4a7ab5" /></div>
      <DeltaBadge delta={metrics.deltas.mrr ?? 0} />
    </div>
  );
}

function TrendCard({ title, subtitle, data, color, formatter }: {
  title: string; subtitle?: string; data: number[]; color: string;
  formatter?: (v: number) => string;
}) {
  const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];
  const pts = data.map((v, i) => ({ week: weeks[i] ?? `Wk ${i + 1}`, value: v }));
  return (
    <div className="rounded-xl p-5" style={CARD}>
      <p className="text-sm font-semibold" style={{ color: "#a8bdd4" }}>{title}</p>
      {subtitle && <p className="text-xs mt-0.5 mb-4" style={{ color: "#4a6a8a" }}>{subtitle}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={pts} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={formatter ?? (v => `$${(v / 1000).toFixed(0)}k`)} />
          <Tooltip {...CHART_TOOLTIP} formatter={(v) => [formatter ? formatter(Number(v)) : fmt$.format(Number(v)), title]} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  metrics: DashboardMetrics;
  live: boolean;
  lastFetched: string;
}

export function DashboardClient({ metrics, live, lastFetched }: Props) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(Math.round(REFRESH_INTERVAL / 1000));

  useEffect(() => {
    const refreshId = setInterval(() => router.refresh(), REFRESH_INTERVAL);
    const tickId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return Math.round(REFRESH_INTERVAL / 1000);
        return prev - 1;
      });
    }, 1000);
    return () => { clearInterval(refreshId); clearInterval(tickId); };
  }, [router]);

  const refundPct = metrics.cashCollectedMTD > 0
    ? (metrics.totalRefundMTD / metrics.cashCollectedMTD) * 100
    : 0;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#dce8f4" }}>Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>Leadwell Advisors · Sales performance overview</p>
        </div>
        <StatusBadge live={live} lastFetched={lastFetched} countdown={countdown} />
      </div>

      {/* Revenue headlines */}
      <div className="space-y-3">
        <SectionHeader title="Revenue" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricTile label="Cash Collected (MTD)" value={fmt$.format(metrics.cashCollectedMTD)}
            delta={metrics.deltas.cashCollectedMTD} gold large icon={DollarSign} />
          <MetricTile label="Cash Collected (YTD)" value={fmt$.format(metrics.cashCollectedYTD)}
            delta={metrics.deltas.cashCollectedYTD} gold large icon={DollarSign} />
        </div>
      </div>

      {/* Business metrics */}
      <div className="space-y-3">
        <SectionHeader title="Business metrics" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile label="Net Revenue (MTD)" value={fmt$.format(metrics.netRevenueMTD)}
            delta={metrics.deltas.netRevenueMTD} icon={TrendingUp} />
          <MrrTile metrics={metrics} />
          <MetricTile label="Total Deals Closed" value={String(metrics.totalDealsClosed)}
            delta={metrics.deltas.totalDealsClosed} isCountDelta icon={Target} />
          <MetricTile label="Cost Per Close" value={metrics.costPerClose > 0 ? fmt$.format(metrics.costPerClose) : "—"}
            delta={metrics.deltas.costPerClose} invertDelta icon={DollarSign} />
        </div>
      </div>

      {/* Ops & health */}
      <div className="space-y-3">
        <SectionHeader title="Ops & health" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile label="Leads This Month" value={metrics.leadsThisMonth.toLocaleString()}
            delta={metrics.deltas.leadsThisMonth} isCountDelta icon={Users} />
          <MetricTile label="Avg Lead Response Time" value={metrics.avgLeadResponseTime} icon={Clock} />
          <MetricTile label="Total Refund (MTD)" value={fmt$.format(metrics.totalRefundMTD)}
            delta={metrics.deltas.totalRefundMTD} invertDelta red icon={AlertTriangle} />
          <MetricTile label="Refund % of Cash" value={`${refundPct.toFixed(1)}%`}
            red={refundPct > 5} icon={AlertTriangle} />
        </div>
      </div>

      {/* Trend charts */}
      <div className="space-y-3">
        <SectionHeader title="Trends · last 6 weeks" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrendCard title="Cash Collected" subtitle="6-week rolling" data={metrics.cashTrend} color="#fcd34d" />
          <TrendCard title="MRR" subtitle="Monthly recurring revenue" data={metrics.mrrTrend} color="#4a7ab5" />
        </div>
      </div>

      <div className="pb-2">
        <p className="text-xs text-center" style={{ color: "#2a3f52" }}>
          Leadwell Advisors Analytics Platform &nbsp;·&nbsp; A Stack N Scale managed client
        </p>
      </div>
    </div>
  );
}
