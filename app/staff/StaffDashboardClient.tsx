"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  DollarSign, Target, TrendingUp, Users, AlertTriangle,
  ChevronDown, ChevronUp, Send,
} from "lucide-react";
import type { SetterStats, CloserStats, RepProductionStats } from "@/lib/analytics/sheet-metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REFRESH_INTERVAL = 45_000;

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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{title}</span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

function MetricTile({ label, value, sub, gold = false, red = false, icon: Icon }: {
  label: string; value: string; sub?: string; gold?: boolean; red?: boolean; icon?: React.ElementType;
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
      <p className="text-3xl font-black tabular-nums leading-none"
        style={{ color: gold ? "#fcd34d" : red ? "#f87171" : "#dce8f4" }}>{value}</p>
      {sub && <p className="mt-1.5 text-xs" style={{ color: "#4a6a8a" }}>{sub}</p>}
    </div>
  );
}

function TrendChart({ title, data, color, formatter }: {
  title: string; data: number[]; color: string; formatter?: (v: number) => string;
}) {
  const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];
  const pts = data.map((v, i) => ({ week: weeks[i] ?? `Wk ${i + 1}`, value: v }));
  return (
    <div className="rounded-xl p-5" style={CARD}>
      <p className="text-sm font-semibold mb-4" style={{ color: "#a8bdd4" }}>{title} · last 6 weeks</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={pts} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#4a6a8a", fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={formatter ?? (v => String(v))} />
          <Tooltip {...CHART_TOOLTIP} formatter={(v) => [formatter ? formatter(Number(v)) : String(v), title]} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Log numbers form ──────────────────────────────────────────────────────────

function LogNumbersForm({ role }: { role: "setter" | "closer" }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  // Setter fields
  const [callsBooked, setCallsBooked] = useState("");
  const [demosScheduled, setDemosScheduled] = useState("");

  // Closer fields
  const [callsMade, setCallsMade] = useState("");
  const [dealsClosed, setDealsClosed] = useState("");
  const [cashCollected, setCashCollected] = useState("");

  function reset() {
    setCallsBooked(""); setDemosScheduled("");
    setCallsMade(""); setDealsClosed(""); setCashCollected("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = role === "setter"
      ? { date, role, callsBooked: Number(callsBooked), demosScheduled: Number(demosScheduled) }
      : { date, role, callsMade: Number(callsMade), dealsClosed: Number(dealsClosed), cashCollected: Number(cashCollected.replace(/[$,]/g, "")) };

    startTransition(async () => {
      const res = await fetch("/api/staff/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit numbers");
        return;
      }
      toast.success("Numbers logged to your sheet");
      reset();
      setOpen(false);
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(180,210,240,0.12)",
    color: "#dce8f4",
  };

  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-5 py-4 text-sm font-semibold transition-all"
        style={{ color: "#a8bdd4" }}
      >
        <Send className="h-4 w-4" style={{ color: "#4a7ab5" }} />
        Log Today's Numbers
        {open ? <ChevronUp className="h-4 w-4 ml-auto opacity-40" /> : <ChevronDown className="h-4 w-4 ml-auto opacity-40" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "rgba(180,210,240,0.08)" }}>
          <div className="pt-4 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              required className="h-10 rounded-lg text-sm" style={inputStyle} />
          </div>

          {role === "setter" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Calls Booked</label>
                <Input type="number" min="0" value={callsBooked} onChange={e => setCallsBooked(e.target.value)}
                  placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Demos Scheduled</label>
                <Input type="number" min="0" value={demosScheduled} onChange={e => setDemosScheduled(e.target.value)}
                  placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Calls Made</label>
                <Input type="number" min="0" value={callsMade} onChange={e => setCallsMade(e.target.value)}
                  placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Deals Closed</label>
                <Input type="number" min="0" value={dealsClosed} onChange={e => setDealsClosed(e.target.value)}
                  placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Cash Collected ($)</label>
                <Input type="text" value={cashCollected} onChange={e => setCashCollected(e.target.value)}
                  placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="h-9 px-5 text-sm font-semibold rounded-lg"
              style={{
                background: "linear-gradient(135deg, #1e3a6e, #2a4f8a)",
                border: "1px solid rgba(180,210,240,0.18)",
                color: "#dce8f4",
              }}>
              {isPending ? "Submitting..." : "Submit to Sheet"}
            </Button>
            <Button type="button" onClick={() => { reset(); setOpen(false); }}
              className="h-9 px-4 text-sm rounded-lg"
              style={{ background: "transparent", border: "1px solid rgba(180,210,240,0.1)", color: "#4a6a8a" }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Production sheet view ─────────────────────────────────────────────────────

function ProductionView({ p, repName, countdown }: { p: RepProductionStats; repName: string; countdown: number }) {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#dce8f4" }}>{repName}'s Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>Personal production · this month · refreshing in {countdown}s</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          Live · refreshing in {countdown}s
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Calls & activity" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricTile label="Calls Made" value={String(p.callsMade)} gold icon={Target} />
          <MetricTile label="Call Connects" value={String(p.callConnects)} icon={Users} />
          <MetricTile label="Appt Sets" value={String(p.appointmentSets)} icon={TrendingUp} />
          <MetricTile label="DMs Sent" value={String(p.dms)} icon={Users} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Demos & sales" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricTile label="Demos Showed" value={String(p.demosShowed)} icon={Users} />
          <MetricTile label="No Shows" value={String(p.noShows)} red icon={AlertTriangle} />
          <MetricTile label="Show Rate" value={`${p.showRate}%`} icon={TrendingUp} />
          <MetricTile label="Sales" value={String(p.sales)} gold icon={Target} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Revenue" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <MetricTile label="Collections" value={fmt$.format(p.collections)} gold icon={DollarSign} />
          <MetricTile label="Commissions" value={fmt$.format(p.commissions)} icon={DollarSign} />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Daily calls · this month" />
        <TrendChart title="Calls Made" data={p.callsTrend.slice(0, 30)} color="#1D9E75"
          formatter={v => String(v)} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  metrics: SetterStats | CloserStats | RepProductionStats;
  role: "setter" | "closer";
  repName: string;
}

export function StaffDashboardClient({ metrics, role, repName }: Props) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(Math.round(REFRESH_INTERVAL / 1000));

  useEffect(() => {
    const refreshId = setInterval(() => router.refresh(), REFRESH_INTERVAL);
    const tickId = setInterval(() => {
      setCountdown(prev => prev <= 1 ? Math.round(REFRESH_INTERVAL / 1000) : prev - 1);
    }, 1000);
    return () => { clearInterval(refreshId); clearInterval(tickId); };
  }, [router]);

  // Production sheet reps have appointmentSets field
  if ("appointmentSets" in metrics) {
    return <ProductionView p={metrics as RepProductionStats} repName={repName} countdown={countdown} />;
  }

  const isSetter = role === "setter";
  const s = metrics as SetterStats;
  const c = metrics as CloserStats;

  const rankOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `#${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#dce8f4" }}>
            {repName}'s Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>
            {isSetter ? "Setter" : "Closer"} · personal stats · refreshing in {countdown}s
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          Live · refreshing in {countdown}s
        </div>
      </div>

      {/* Rank card */}
      <div className="rounded-xl p-5" style={{ ...CARD, borderLeft: "3px solid rgba(74,122,181,0.6)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "#5a7a9a" }}>
          Your Rank
        </p>
        <p className="text-4xl font-black tabular-nums" style={{ color: "#dce8f4" }}>
          {isSetter ? rankOrdinal(s.rankAmongSetters) : rankOrdinal(c.rankAmongClosers)}
        </p>
        <p className="text-xs mt-1" style={{ color: "#4a6a8a" }}>
          of {isSetter ? s.totalSetters : c.totalClosers} {isSetter ? "setters" : "closers"}
        </p>
      </div>

      {/* Key metrics */}
      <div className="space-y-3">
        <SectionHeader title="Your numbers · this month" />
        {isSetter ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricTile label="Calls Booked" value={String(s.callsBooked)} gold icon={Target} />
            <MetricTile label="Demos Showed" value={String(s.demosShowed)} icon={Users} />
            <MetricTile label="No Shows" value={String(s.noShows)} red icon={AlertTriangle} />
            <MetricTile label="Show Rate" value={`${s.showRate}%`} icon={TrendingUp} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricTile label="Cash Collected" value={fmt$.format(c.cashCollected)} gold icon={DollarSign} />
            <MetricTile label="Deals Closed" value={String(c.dealsClosed)} icon={Target} />
            <MetricTile label="Close Rate" value={`${c.closeRate}%`} icon={TrendingUp} />
            <MetricTile label="Avg Deal Size" value={fmt$.format(c.avgDealSize)} icon={DollarSign} />
          </div>
        )}
      </div>

      {/* Trend chart */}
      <div className="space-y-3">
        <SectionHeader title="Trend · last 6 weeks" />
        {isSetter ? (
          <TrendChart title="Calls Booked" data={s.bookingTrend} color="#1D9E75" />
        ) : (
          <TrendChart title="Cash Collected" data={c.cashTrend} color="#fcd34d"
            formatter={v => `$${(v / 1000).toFixed(1)}k`} />
        )}
      </div>

      {/* Log numbers */}
      <div className="space-y-3">
        <SectionHeader title="Submit numbers" />
        <LogNumbersForm role={role} />
      </div>

      <div className="pb-2">
        <p className="text-xs text-center" style={{ color: "#2a3f52" }}>
          Leadwell Advisors Analytics Platform &nbsp;·&nbsp; A Stack N Scale managed client
        </p>
      </div>
    </div>
  );
}
