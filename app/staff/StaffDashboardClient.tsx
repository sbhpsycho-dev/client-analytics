"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Phone, MessageSquare, Calendar, Eye, BarChart2, DollarSign, TrendingUp, ChevronDown, ChevronUp, Send } from "lucide-react";
import type { SetterStats, CloserStats, RepProductionStats } from "@/lib/analytics/sheet-metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REFRESH_INTERVAL = 45_000;

// ── SNS Design tokens ─────────────────────────────────────────────────────────
const BG       = "#0a0a0a";
const CARD     = "#141414";
const BORDER   = "rgba(255,255,255,0.08)";
const ORANGE   = "#f97316";
const GREEN    = "#22c55e";
const RED      = "#ef4444";
const TEXT     = "#ffffff";
const MUTED    = "#888888";

const card: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
};

const fmt$ = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ── MetricCard (SNS pattern) ──────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, accent = "default" }: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  accent?: "default" | "orange" | "green" | "red";
}) {
  const accentColor = accent === "orange" ? ORANGE : accent === "green" ? GREEN : accent === "red" ? RED : TEXT;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={card}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: MUTED }} />}
      </div>
      <p className="text-2xl font-bold leading-tight tracking-tight" style={{ color: accentColor }}>
        {value}
      </p>
    </div>
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────

function TrendChart({ title, data, color = ORANGE, formatter }: {
  title: string;
  data: number[];
  color?: string;
  formatter?: (v: number) => string;
}) {
  const pts = data.map((v, i) => ({ i: i + 1, v }));
  return (
    <div className="rounded-xl p-5" style={card}>
      <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={pts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="i" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={formatter ?? (v => String(v))} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TEXT }}
            cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
            formatter={(v) => [formatter ? formatter(Number(v)) : String(v), title]}
          />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} dot={false}
            activeDot={{ r: 4, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{title}</p>
      <div className="h-px flex-1" style={{ background: BORDER }} />
    </div>
  );
}

// ── Production log form ───────────────────────────────────────────────────────

function ProductionLogForm() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [callsMade, setCallsMade] = useState("");
  const [dms, setDms] = useState("");
  const [callConnects, setCallConnects] = useState("");
  const [appointmentSets, setAppointmentSets] = useState("");
  const [demosShowed, setDemosShowed] = useState("");
  const [sales, setSales] = useState("");
  const [collections, setCollections] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setCallsMade(""); setDms(""); setCallConnects("");
    setAppointmentSets(""); setDemosShowed(""); setSales(""); setCollections("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/staff/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          callsMade:       Number(callsMade)       || 0,
          dms:             Number(dms)             || 0,
          callConnects:    Number(callConnects)    || 0,
          appointmentSets: Number(appointmentSets) || 0,
          demosShowed:     Number(demosShowed)     || 0,
          sales:           Number(sales)           || 0,
          collections:     Number(collections.replace(/[$,]/g, "")) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to submit"); return; }
      toast.success("Numbers logged to your sheet");
      reset();
      setOpen(false);
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 8,
  };

  const fields = [
    { label: "Calls Made",    value: callsMade,       set: setCallsMade,       icon: Phone },
    { label: "DMs",           value: dms,             set: setDms,             icon: MessageSquare },
    { label: "Call Connects", value: callConnects,    set: setCallConnects,    icon: Phone },
    { label: "Appt Sets",     value: appointmentSets, set: setAppointmentSets, icon: Calendar },
    { label: "Demos Showed",  value: demosShowed,     set: setDemosShowed,     icon: Eye },
    { label: "Sales",         value: sales,           set: setSales,           icon: TrendingUp },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={card}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-5 py-4 text-sm font-semibold"
        style={{ color: TEXT }}>
        <Send className="h-4 w-4" style={{ color: ORANGE }} />
        Log Today's Numbers
        {open
          ? <ChevronUp className="h-4 w-4 ml-auto" style={{ color: MUTED }} />
          : <ChevronDown className="h-4 w-4 ml-auto" style={{ color: MUTED }} />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: BORDER }}>
          <div className="pt-4 space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              required className="h-10 rounded-lg text-sm" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fields.map(({ label, value, set }) => (
              <div key={label} className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</label>
                <Input type="number" min="0" value={value} onChange={e => set(e.target.value)}
                  placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Collections ($)</label>
              <Input type="text" value={collections} onChange={e => setCollections(e.target.value)}
                placeholder="0" required className="h-10 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="h-9 px-5 text-sm font-semibold rounded-lg"
              style={{ background: ORANGE, border: "none", color: "#fff" }}>
              {isPending ? "Submitting..." : "Submit to Sheet"}
            </Button>
            <Button type="button" onClick={() => { reset(); setOpen(false); }}
              className="h-9 px-4 text-sm rounded-lg"
              style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Production view (SNS style) ───────────────────────────────────────────────

function ProductionView({ p, repName, countdown }: { p: RepProductionStats; repName: string; countdown: number }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" style={{ background: BG }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TEXT }}>{repName}</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>{today}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}30` }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
          Live · refreshing in {countdown}s
        </div>
      </div>

      {/* Activity */}
      <div className="space-y-2">
        <Section title="Activity" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Calls Made"    value={p.callsMade}       icon={Phone}        accent="orange" />
          <MetricCard label="Call Connects" value={p.callConnects}    icon={Phone} />
          <MetricCard label="Appt Sets"     value={p.appointmentSets} icon={Calendar} />
          <MetricCard label="DMs Sent"      value={p.dms}             icon={MessageSquare} />
        </div>
      </div>

      {/* Demos & Sales */}
      <div className="space-y-2">
        <Section title="Demos & Sales" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Demos Showed" value={p.demosShowed} icon={Eye} accent="green" />
          <MetricCard label="No Shows"     value={p.noShows}     icon={Eye}  accent="red" />
          <MetricCard label="Show Rate"    value={`${p.showRate}%`}
            icon={BarChart2}
            accent={p.showRate >= 60 ? "green" : p.showRate >= 40 ? "orange" : "red"} />
          <MetricCard label="Sales"        value={p.sales}       icon={TrendingUp} accent="orange" />
        </div>
      </div>

      {/* Revenue */}
      <div className="space-y-2">
        <Section title="Revenue" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Collections"  value={fmt$.format(p.collections)} icon={DollarSign} accent="green" />
          <MetricCard label="Commissions"  value={fmt$.format(p.commissions)} icon={DollarSign} />
        </div>
      </div>

      {/* Trend */}
      <div className="space-y-2">
        <Section title="Daily calls this month" />
        <TrendChart title="Calls Made" data={p.callsTrend.slice(0, 31)} color={ORANGE} />
      </div>

      {/* Log numbers */}
      <div className="space-y-2">
        <Section title="Log numbers" />
        <ProductionLogForm />
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

  // Production sheet reps
  if ("appointmentSets" in metrics) {
    return <ProductionView p={metrics as RepProductionStats} repName={repName} countdown={countdown} />;
  }

  // Legacy setter/closer view
  const isSetter = role === "setter";
  const s = metrics as SetterStats;
  const c = metrics as CloserStats;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" style={{ background: BG }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TEXT }}>{repName}</h1>
          <p className="text-sm" style={{ color: MUTED }}>{isSetter ? "Setter" : "Closer"} · this month</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}30` }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
          Live · refreshing in {countdown}s
        </div>
      </div>

      <div className="space-y-2">
        <Section title="Your numbers" />
        {isSetter ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Calls Booked"  value={s.callsBooked}    accent="orange" icon={Phone} />
            <MetricCard label="Demos Showed"  value={s.demosShowed}    accent="green"  icon={Eye} />
            <MetricCard label="No Shows"      value={s.noShows}        accent="red"    icon={Eye} />
            <MetricCard label="Show Rate"     value={`${s.showRate}%`} icon={BarChart2}
              accent={s.showRate >= 60 ? "green" : s.showRate >= 40 ? "orange" : "red"} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Cash Collected" value={fmt$.format(c.cashCollected)} accent="orange" icon={DollarSign} />
            <MetricCard label="Deals Closed"   value={c.dealsClosed}               icon={TrendingUp} />
            <MetricCard label="Close Rate"     value={`${c.closeRate}%`}
              accent={c.closeRate >= 30 ? "green" : c.closeRate >= 15 ? "orange" : "red"} icon={BarChart2} />
            <MetricCard label="Avg Deal Size"  value={fmt$.format(c.avgDealSize)}  icon={DollarSign} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Section title="Trend" />
        {isSetter
          ? <TrendChart title="Calls Booked" data={s.bookingTrend} color={ORANGE} />
          : <TrendChart title="Cash Collected" data={c.cashTrend} color={GREEN} formatter={v => `$${(v/1000).toFixed(1)}k`} />
        }
      </div>
    </div>
  );
}
