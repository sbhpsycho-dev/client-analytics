import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Users2, Zap, BarChart2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-blue-500/15 text-blue-400 border-blue-500/20",
  contacted:   "bg-purple-500/15 text-purple-400 border-purple-500/20",
  qualified:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  booked:      "bg-amber-500/15 text-amber-400 border-amber-500/20",
  lost:        "bg-red-500/15 text-red-400 border-red-500/20",
  closed:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const CARD = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(180,210,240,0.05)",
} as React.CSSProperties;

export default async function LeadsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) redirect("/login");

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("excluded", false)
    .order("date", { ascending: false })
    .limit(200);

  const allLeads = leads ?? [];

  // Inline KPI computation
  const totalLeads = allLeads.length;
  const activeFn = (l: { status?: string | null }) =>
    l.status && !["lost", "closed"].includes(l.status);
  const activeCount = allLeads.filter(activeFn).length;
  const activePct = totalLeads > 0 ? Math.round((activeCount / totalLeads) * 100) : 0;

  // Top source
  const sourceCounts: Record<string, number> = {};
  for (const l of allLeads) {
    if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1;
  }
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const summaryCards = [
    { label: "Total Leads", value: totalLeads, icon: Users2, color: "#a8bdd4", bg: "rgba(42,79,138,0.18)", border: "#4a7ab5" },
    { label: "Top Source", value: topSource, icon: Zap, color: "#fcd34d", bg: "rgba(251,191,36,0.09)", border: "#f59e0b" },
    { label: "Active %", value: `${activePct}%`, icon: BarChart2, color: "#6ee7b7", bg: "rgba(52,211,153,0.10)", border: "#34d399" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="text-sm mt-0.5" style={{ color: "#4a6a8a" }}>
          {totalLeads} records &nbsp;·&nbsp; All time
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
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
            <p className="text-3xl font-bold tabular-nums leading-none truncate" style={{ color: "#dce8f4" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {!allLeads.length ? (
        <EmptyState
          icon={Users2}
          title="No leads yet"
          description="Lead data will appear here once your sheet is mapped and synced."
        />
      ) : (
        <div className="rounded-xl overflow-x-auto" style={CARD}>
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(180,210,240,0.08)", background: "rgba(13,24,40,0.6)" }}>
                {["Date", "Lead", "Source", "Setter", "Status", "Notes"].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLeads.map((l, i) => (
                <tr
                  key={l.id}
                  className="transition-colors"
                  style={{ borderBottom: i < allLeads.length - 1 ? "1px solid rgba(180,210,240,0.05)" : undefined }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <td className="px-4 py-3.5 text-xs tabular-nums" style={{ color: "#4a6a8a" }}>{l.date ?? "—"}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">{l.lead_name ?? "—"}</td>
                  <td className="px-4 py-3.5" style={{ color: "#a8bdd4" }}>{l.source ?? "—"}</td>
                  <td className="px-4 py-3.5" style={{ color: "#a8bdd4" }}>{l.setter ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    {l.status ? (
                      <Badge className={`border text-[11px] font-semibold ${STATUS_COLORS[l.status] ?? "bg-zinc-700/60 text-zinc-400 border-zinc-600/30"}`}>
                        {l.status}
                      </Badge>
                    ) : <span style={{ color: "#2a3f52" }}>—</span>}
                  </td>
                  <td className="px-4 py-3.5 max-w-xs truncate text-xs" style={{ color: "#4a6a8a" }}>{l.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
