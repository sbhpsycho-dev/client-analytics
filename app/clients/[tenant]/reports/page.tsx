import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { computeKPIs } from "@/lib/analytics/kpis";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Suspense } from "react";
import { PeriodTabs } from "./PeriodTabs";

type Period = "mtd" | "qtd" | "ytd";

function getRange(period: Period): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();

  if (period === "mtd") {
    from.setDate(1);
  } else if (period === "qtd") {
    const q = Math.floor(from.getMonth() / 3);
    from.setMonth(q * 3, 1);
  } else {
    from.setMonth(0, 1);
  }
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

const PERIOD_LABELS: Record<Period, string> = {
  mtd: "Month to Date",
  qtd: "Quarter to Date",
  ytd: "Year to Date",
};

const CHART_CARD = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(180,210,240,0.05)",
} as React.CSSProperties;

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenant: slug } = await params;
  const sp = await searchParams;
  const period: Period = (["mtd", "qtd", "ytd"].includes(sp.period ?? "") ? sp.period : "mtd") as Period;

  const supabase = await createClient();
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) redirect("/login");

  const range = getRange(period);

  const [{ data: allCalls }, { data: allLeads }] = await Promise.all([
    supabase.from("calls").select("*").eq("tenant_id", tenant.id).eq("excluded", false),
    supabase.from("leads").select("*").eq("tenant_id", tenant.id).eq("excluded", false),
  ]);

  const kpis = computeKPIs(allCalls ?? [], allLeads ?? [], range);
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="p-6 space-y-8 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: "#4a6a8a" }}>
            Performance summary &nbsp;·&nbsp; {PERIOD_LABELS[period]}
          </p>
        </div>
        <Suspense>
          <PeriodTabs active={period} />
        </Suspense>
      </div>

      {/* KPI Summary */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={CHART_CARD}
      >
        <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "#4a6a8a" }}>
          Key Metrics &nbsp;·&nbsp; {PERIOD_LABELS[period]}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Cash Collected"  value={fmt.format(kpis.cashCollected)} variant="rate-good" />
          <MetricCard label="Close Rate"      value={kpis.closeRate} suffix="%"       variant="rate-good" />
          <MetricCard label="Show Rate"       value={kpis.showRate}  suffix="%"       variant="rate-warn" />
          <MetricCard label="AOV"             value={fmt.format(kpis.aov)}            variant="revenue" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Calls Booked"   value={kpis.callsBooked}              variant="rate-warn" />
          <MetricCard label="Deals Closed"   value={kpis.funnel.closed}            variant="rate-good" />
          <MetricCard label="Pipeline Value" value={fmt.format(kpis.pipelineValue)} variant="revenue" />
          <MetricCard label="Contract Value" value={fmt.format(kpis.contractValue)} variant="revenue" />
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="rounded-xl p-5 space-y-4" style={CHART_CARD}>
        <p className="text-sm font-semibold" style={{ color: "#a8bdd4" }}>Revenue Trend</p>
        <TrendChart data={kpis.trends} metric="revenue" color={tenant.brand_color} />
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl p-5 space-y-4" style={CHART_CARD}>
          <p className="text-sm font-semibold" style={{ color: "#a8bdd4" }}>Show Rate Trend</p>
          <TrendChart data={kpis.trends} metric="showRate" color={tenant.brand_color} />
        </div>
        <div className="rounded-xl p-5 space-y-4" style={CHART_CARD}>
          <p className="text-sm font-semibold" style={{ color: "#a8bdd4" }}>Calls Booked Trend</p>
          <TrendChart data={kpis.trends} metric="callsBooked" color={tenant.brand_color} />
        </div>
      </div>

    </div>
  );
}
