import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface SetterStat {
  name: string;
  role: "Setter";
  appointed: number;
  shows: number;
  showRate: number;
  conversions: number;
  conversionRate: number;
}

export interface CloserStat {
  name: string;
  role: "Closer" | "Sales Director";
  closes: number;
  cashCollected: number;
  avgDealSize: number;
  closeRate: number;
}

export interface TeamAggregate {
  teamShowUpRate: number;
  teamCloseRate: number;
  totalCash: number;
}

export interface ManualKPIRow {
  id: string;
  member_name: string;
  role: string;
  metric_name: string;
  value: number | null;
  value_label: string | null;
  period_label: string | null;
}

export async function getComputedKPIs(
  supabase: SupabaseClient<Database>,
  tenantId: string
) {
  const { data: calls } = await supabase
    .from("calls")
    .select("setter, closer, status, outcome, cash_collected")
    .eq("tenant_id", tenantId)
    .eq("excluded", false);

  const rows = calls ?? [];

  // --- Setter stats ---
  const setterMap = new Map<string, { booked: number; showed: number; closed: number }>();
  for (const c of rows) {
    if (!c.setter) continue;
    if (!setterMap.has(c.setter)) setterMap.set(c.setter, { booked: 0, showed: 0, closed: 0 });
    const s = setterMap.get(c.setter)!;
    s.booked++;
    if (c.status === "showed") s.showed++;
    if (c.outcome === "closed") s.closed++;
  }

  const setters: SetterStat[] = Array.from(setterMap.entries()).map(([name, s]) => ({
    name,
    role: "Setter",
    appointed: s.booked,
    shows: s.showed,
    showRate: s.booked > 0 ? Math.round((s.showed / s.booked) * 100) : 0,
    conversions: s.closed,
    conversionRate: s.showed > 0 ? Math.round((s.closed / s.showed) * 100) : 0,
  }));

  // --- Closer stats ---
  const closerMap = new Map<string, { shows: number; closes: number; cash: number }>();
  for (const c of rows) {
    if (!c.closer) continue;
    if (!closerMap.has(c.closer)) closerMap.set(c.closer, { shows: 0, closes: 0, cash: 0 });
    const cl = closerMap.get(c.closer)!;
    if (c.status === "showed") cl.shows++;
    if (c.outcome === "closed") {
      cl.closes++;
      cl.cash += Number(c.cash_collected ?? 0);
    }
  }

  const closers: CloserStat[] = Array.from(closerMap.entries()).map(([name, cl]) => ({
    name,
    role: "Closer",
    closes: cl.closes,
    cashCollected: cl.cash,
    avgDealSize: cl.closes > 0 ? Math.round(cl.cash / cl.closes) : 0,
    closeRate: cl.shows > 0 ? Math.round((cl.closes / cl.shows) * 100) : 0,
  }));

  // --- Team aggregates ---
  const totalBooked = rows.length;
  const totalShowed = rows.filter(c => c.status === "showed").length;
  const totalClosed = rows.filter(c => c.outcome === "closed").length;
  const totalCash = rows.reduce((s, c) => s + Number(c.cash_collected ?? 0), 0);

  const team: TeamAggregate = {
    teamShowUpRate: totalBooked > 0 ? Math.round((totalShowed / totalBooked) * 100) : 0,
    teamCloseRate: totalShowed > 0 ? Math.round((totalClosed / totalShowed) * 100) : 0,
    totalCash,
  };

  return { setters, closers, team };
}

export async function getManualKPIs(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<ManualKPIRow[]> {
  const { data } = await (supabase as any)
    .from("team_kpis")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
