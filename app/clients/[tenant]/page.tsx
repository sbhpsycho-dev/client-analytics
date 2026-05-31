import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";
import { computeKPIs } from "@/lib/analytics/kpis";
import { redirect } from "next/navigation";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { SetterLeaderboard } from "@/components/dashboard/SetterLeaderboard";
import { CloserLeaderboard } from "@/components/dashboard/CloserLeaderboard";
import { FilledCard } from "@/components/dashboard/FilledCard";
import { DateRangeNav } from "@/components/dashboard/DateRangeNav";
import { AccordionSection } from "@/components/ui/accordion-section";
import { Suspense } from "react";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function getMTDRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function parseRange(fromParam: string | undefined, toParam: string | undefined): { from: Date; to: Date } {
  const mtd = getMTDRange();
  const from = fromParam ? new Date(fromParam + "T00:00:00") : mtd.from;
  const to = toParam ? new Date(toParam + "T23:59:59") : mtd.to;
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return mtd;
  return { from, to };
}

function getRangeLabel(from: Date, to: Date): string {
  const mtd = getMTDRange();
  const isMTD = from.toDateString() === mtd.from.toDateString() && to.toDateString() === mtd.to.toDateString();
  if (isMTD) return from.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const CHART_CARD: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(180,210,240,0.05)",
};

function GoalProgress({ current, goal, brandColor }: { current: number; goal: number; brandColor: string }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : (current > 0 ? 100 : 0);
  const remaining = goal - current;

  return (
    <div className="rounded-xl p-6" style={CHART_CARD}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-white">Monthly Revenue Goal</p>
      </div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-4xl font-black text-white tabular-nums">{fmt.format(current)}</p>
        <p className="text-sm" style={{ color: "#4a6a8a" }}>of {fmt.format(goal)} goal</p>
      </div>
      <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(180,210,240,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${brandColor}90 0%, ${brandColor} 100%)`,
            boxShadow: `0 0 12px ${brandColor}60`,
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "#4a6a8a" }}>{pct.toFixed(1)}% complete</span>
        <span className="text-xs" style={{ color: remaining > 0 ? "#4a6a8a" : "#4ade80" }}>
          {remaining > 0 ? `${fmt.format(remaining)} remaining` : "Goal reached! 🎯"}
        </span>
      </div>
    </div>
  );
}

async function DashboardContent({
  tenantSlug,
  fromParam,
  toParam,
}: {
  tenantSlug: string;
  fromParam: string | undefined;
  toParam: string | undefined;
}) {
  const supabase = await createClient();
  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) redirect("/login");

  const range = parseRange(fromParam, toParam);
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);

  const [{ data: calls }, { data: leads }] = await Promise.all([
    supabase.from("calls").select("*").eq("tenant_id", tenant.id).eq("excluded", false)
      .gte("date", fromStr).lte("date", toStr),
    supabase.from("leads").select("*").eq("tenant_id", tenant.id).eq("excluded", false)
      .gte("date", fromStr).lte("date", toStr),
  ]);

  const callList = calls ?? [];
  const leadList = leads ?? [];
  const hasData = callList.length > 0 || leadList.length > 0;
  const kpis = computeKPIs(callList, leadList, range);
  const monthlyGoal = (tenant as any).monthly_goal ?? 10000;

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">
            {tenant.welcome_message ?? "Welcome back"}
          </h1>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "#4a6a8a" }}>
            {tenant.name} &nbsp;·&nbsp; {getRangeLabel(range.from, range.to)}
          </p>
        </div>
        <DateRangeNav from={fromStr} to={toStr} />
      </div>

      {/* No-data notice */}
      {!hasData && (
        <div
          className="rounded-xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(42,79,138,0.12) 0%, rgba(13,24,40,0.8) 100%)",
            border: "1px solid rgba(74,122,181,0.25)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "#dce8f4" }}>No data for this period</p>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>
            Use a different date range, or go to{" "}
            <span style={{ color: "#7a9ab8" }}>Admin → Manage → Data Entry</span> to add records manually.
          </p>
        </div>
      )}

      {/* ── Primary KPIs ───────────────────────────────────────── */}
      <AccordionSection title="Primary KPIs" defaultOpen storageKey="kpis-primary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          <FilledCard index={0} label="Cash Collected"   value={fmt.format(kpis.cashCollected)}  theme="emerald" />
          <FilledCard index={1} label="Contract Value"   value={fmt.format(kpis.contractValue)}  theme="navy"    />
          <FilledCard index={2} label="Calls Booked"     value={kpis.callsBooked}               theme="slate"   />
          <FilledCard index={3} label="Deals Closed"     value={kpis.funnel.closed}             theme="emerald" />
          <FilledCard index={4} label="Show Rate"        value={`${kpis.showRate}%`}            theme="teal"    />
          <FilledCard index={5} label="Close Rate"       value={`${kpis.closeRate}%`}           theme="teal"    />
        </div>
      </AccordionSection>

      {/* ── Secondary KPIs ─────────────────────────────────────── */}
      <AccordionSection title="Pipeline Breakdown" defaultOpen storageKey="kpis-secondary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          <FilledCard index={6}  label="AOV"           value={fmt.format(kpis.aov)}           theme="navy"  sub="Per closed deal" />
          <FilledCard index={7}  label="Pipeline"      value={fmt.format(kpis.pipelineValue)} theme="amber" sub="Open pipeline" />
          <FilledCard index={8}  label="Shows"         value={kpis.callsShowed}               theme="slate" sub="Showed up" />
          <FilledCard index={9}  label="No-Shows"      value={kpis.noShows}                   theme="slate" sub="Did not attend" />
          <FilledCard index={10} label="Reschedules"   value={kpis.reschedules}               theme="amber" sub="Rebooked" />
          <FilledCard index={11} label="No-Show Rate"  value={`${kpis.noShowRate}%`}          theme="slate" sub="Of total" />
        </div>
      </AccordionSection>

      {/* ── Monthly goal ────────────────────────────────────────── */}
      {!fromParam && !toParam && (
        <GoalProgress current={kpis.cashCollected} goal={monthlyGoal} brandColor={tenant.brand_color} />
      )}

      {/* ── Charts ─────────────────────────────────────────────── */}
      <AccordionSection title="Trends & Funnel" defaultOpen storageKey="charts">
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl p-5" style={CHART_CARD}>
              <p className="text-sm font-semibold mb-4" style={{ color: "#a8bdd4" }}>Calls Over Time</p>
              <TrendChart data={kpis.trends} metric="callsBooked" color={tenant.brand_color} />
            </div>
            <div className="rounded-xl p-5" style={CHART_CARD}>
              <p className="text-sm font-semibold mb-4" style={{ color: "#a8bdd4" }}>Sales Funnel</p>
              <FunnelChart funnel={kpis.funnel} brandColor={tenant.brand_color} />
            </div>
          </div>
          <div className="rounded-xl p-5" style={CHART_CARD}>
            <p className="text-sm font-semibold mb-4" style={{ color: "#a8bdd4" }}>Revenue Over Time</p>
            <TrendChart data={kpis.trends} metric="revenue" color={tenant.brand_color} />
          </div>
        </div>
      </AccordionSection>

      {/* ── Leaderboards ───────────────────────────────────────── */}
      <AccordionSection title="Leaderboards" defaultOpen storageKey="leaderboards">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-1">
          <div className="rounded-xl p-5" style={CHART_CARD}>
            <p className="text-sm font-semibold mb-4" style={{ color: "#a8bdd4" }}>Setter Leaderboard</p>
            <SetterLeaderboard data={kpis.setterLeaderboard} />
          </div>
          <div className="rounded-xl p-5" style={CHART_CARD}>
            <p className="text-sm font-semibold mb-4" style={{ color: "#a8bdd4" }}>Closer Leaderboard</p>
            <CloserLeaderboard data={kpis.closerLeaderboard} />
          </div>
        </div>
      </AccordionSection>

    </div>
  );
}

export default async function TenantDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { tenant } = await params;
  const { from, to } = await searchParams;

  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="h-7 w-48 rounded-lg bg-zinc-800/60 animate-pulse" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[120px] rounded-xl bg-zinc-800/60 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        <div className="h-24 rounded-xl bg-zinc-800/60 animate-pulse" />
        <div className="h-48 rounded-xl bg-zinc-800/60 animate-pulse" />
      </div>
    }>
      <DashboardContent tenantSlug={tenant} fromParam={from} toParam={to} />
    </Suspense>
  );
}
