import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Phone, TrendingUp, DollarSign, Target } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  showed:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  booked:      "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "no-show":   "bg-red-500/15 text-red-400 border-red-500/20",
  rescheduled: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  canceled:    "bg-zinc-700/60 text-zinc-400 border-zinc-600/30",
};

const OUTCOME_COLORS: Record<string, string> = {
  closed:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "follow-up": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  lost:        "bg-red-500/15 text-red-400 border-red-500/20",
};

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const CARD = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(180,210,240,0.05)",
} as React.CSSProperties;

export default async function CallsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) redirect("/login");

  const { data: calls } = await supabase
    .from("calls")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("excluded", false)
    .order("date", { ascending: false })
    .limit(200);

  const allCalls = calls ?? [];

  // Inline KPI computation
  const totalCalls = allCalls.length;
  const showed = allCalls.filter((c) => c.status === "showed").length;
  const closed = allCalls.filter((c) => c.outcome === "closed").length;
  const showRate = totalCalls > 0 ? Math.round((showed / totalCalls) * 100) : 0;
  const closeRate = showed > 0 ? Math.round((closed / showed) * 100) : 0;
  const cashCollected = allCalls.reduce((s, c) => s + (c.cash_collected ?? 0), 0);

  const summaryCards = [
    { label: "Total Calls", value: totalCalls, icon: Phone, color: "#4a7ab5", bg: "rgba(42,79,138,0.18)", border: "#4a7ab5" },
    { label: "Show Rate", value: `${showRate}%`, icon: TrendingUp, color: "#fcd34d", bg: "rgba(251,191,36,0.09)", border: "#f59e0b" },
    { label: "Close Rate", value: `${closeRate}%`, icon: Target, color: "#6ee7b7", bg: "rgba(52,211,153,0.10)", border: "#34d399" },
    { label: "Cash Collected", value: fmt.format(cashCollected), icon: DollarSign, color: "#6ee7b7", bg: "rgba(52,211,153,0.10)", border: "#34d399" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Calls</h1>
        <p className="text-sm mt-0.5" style={{ color: "#4a6a8a" }}>
          {totalCalls} records &nbsp;·&nbsp; All time
        </p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className="rounded-xl p-5 border-l-[3px] transition-all duration-200 hover:scale-[1.015]"
            style={{
              background: `linear-gradient(135deg, ${bg} 0%, rgba(13,24,40,0.75) 100%)`,
              borderLeftColor: border,
              borderTop: "1px solid rgba(180,210,240,0.07)",
              borderRight: "1px solid rgba(180,210,240,0.07)",
              borderBottom: "1px solid rgba(180,210,240,0.07)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-3.5 w-3.5" style={{ color }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{label}</p>
            </div>
            <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: "#dce8f4" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {!allCalls.length ? (
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description="Data will appear here once the Google Sheet sync completes."
        />
      ) : (
        <div className="rounded-xl overflow-x-auto" style={CARD}>
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(180,210,240,0.08)", background: "rgba(13,24,40,0.6)" }}>
                {["Date", "Lead", "Setter", "Closer", "Status", "Outcome", "Cash", "Value"].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCalls.map((c, i) => (
                <tr
                  key={c.id}
                  className="transition-colors"
                  style={{
                    borderBottom: i < allCalls.length - 1 ? "1px solid rgba(180,210,240,0.05)" : undefined,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <td className="px-4 py-3.5 text-xs tabular-nums" style={{ color: "#4a6a8a" }}>{c.date ?? "—"}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">{c.lead_name ?? "—"}</td>
                  <td className="px-4 py-3.5" style={{ color: "#a8bdd4" }}>{c.setter ?? "—"}</td>
                  <td className="px-4 py-3.5" style={{ color: "#a8bdd4" }}>{c.closer ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    {c.status ? (
                      <Badge className={`border text-[11px] font-semibold ${STATUS_COLORS[c.status] ?? "bg-zinc-700/60 text-zinc-400 border-zinc-600/30"}`}>
                        {c.status}
                      </Badge>
                    ) : <span style={{ color: "#2a3f52" }}>—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {c.outcome ? (
                      <Badge className={`border text-[11px] font-semibold ${OUTCOME_COLORS[c.outcome] ?? "bg-zinc-700/60 text-zinc-400 border-zinc-600/30"}`}>
                        {c.outcome}
                      </Badge>
                    ) : <span style={{ color: "#2a3f52" }}>—</span>}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums font-medium" style={{ color: c.cash_collected ? "#6ee7b7" : "#2a3f52" }}>
                    {c.cash_collected != null ? fmt.format(c.cash_collected) : "—"}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums" style={{ color: "#a8bdd4" }}>
                    {c.contract_value != null ? fmt.format(c.contract_value) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
