import { createServiceClient } from "@/lib/supabase/service";
import type { DashboardMetrics, RepProductionStats } from "./sheet-metrics";

export interface DailyNumberRow {
  id: string;
  date: string;
  calls_made: number;
  dms: number;
  connects: number;
  sets: number;
  shows: number;
  intro_units: number;
  major_units: number;
  sales: number;
  collections: number;
  commissions: number;
  terms_status: string;
  sheets_synced: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function currentYearRange(): { from: string; to: string } {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function buildCashTrend(rows: { date: string; collections: number }[]): number[] {
  const buckets: Record<string, number> = {};
  for (const r of rows) {
    const k = isoWeekKey(r.date);
    buckets[k] = (buckets[k] ?? 0) + Number(r.collections);
  }
  const sorted = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const trend = sorted.map(([, v]) => Math.round(v));
  while (trend.length < 6) trend.unshift(0);
  return trend;
}

function buildCallsTrend(rows: { date: string; calls_made: number }[]): number[] {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const trend = Array(daysInMonth).fill(0) as number[];
  for (const r of rows) {
    const day = new Date(r.date).getDate() - 1;
    if (day >= 0 && day < daysInMonth) trend[day] = Number(r.calls_made);
  }
  return trend;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getRepDailyNumbers(staffId: string): Promise<DailyNumberRow[]> {
  const service = createServiceClient();
  const { data } = await service
    .from("daily_numbers")
    .select("id,date,calls_made,dms,connects,sets,shows,intro_units,major_units,sales,collections,commissions,terms_status,sheets_synced")
    .eq("staff_id", staffId)
    .order("date", { ascending: false })
    .limit(90);
  return (data ?? []).map(r => ({
    id:           r.id,
    date:         r.date,
    calls_made:   Number(r.calls_made),
    dms:          Number(r.dms),
    connects:     Number(r.connects),
    sets:         Number(r.sets),
    shows:        Number(r.shows),
    intro_units:  Number(r.intro_units),
    major_units:  Number(r.major_units),
    sales:        Number(r.sales),
    collections:  Number(r.collections),
    commissions:  Number(r.commissions),
    terms_status: r.terms_status ?? "",
    sheets_synced: r.sheets_synced,
  }));
}

export async function getRepProductionStats(staffId: string, name: string): Promise<RepProductionStats> {
  const service = createServiceClient();
  const { from, to } = currentMonthRange();

  const { data } = await service
    .from("daily_numbers")
    .select("date,calls_made,dms,connects,sets,shows,intro_units,major_units,sales,collections,commissions")
    .eq("staff_id", staffId)
    .gte("date", from)
    .lte("date", to);

  const rows = data ?? [];
  const sum = (key: keyof typeof rows[0]) =>
    rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  const set   = sum("sets");
  const show  = sum("shows");
  const sales = sum("sales");

  return {
    name,
    sheetId:     "",
    callsMade:   sum("calls_made"),
    dms:         sum("dms"),
    connects:    sum("connects"),
    set,
    show,
    introUnits:  sum("intro_units"),
    majorUnits:  sum("major_units"),
    sales,
    collections: sum("collections"),
    commissions: sum("commissions"),
    showRate:    set   > 0 ? Math.round((show  / set)   * 100) : 0,
    closeRate:   show  > 0 ? Math.round((sales / show)  * 100) : 0,
    callsTrend:  buildCallsTrend(rows as { date: string; calls_made: number }[]),
  };
}

export async function getAdminDashboardStats(): Promise<{
  dashboard: DashboardMetrics;
  repStats: RepProductionStats[];
  live: boolean;
  lastFetched: string;
}> {
  const service = createServiceClient();
  const { from: mFrom, to: mTo } = currentMonthRange();
  const { from: yFrom, to: yTo } = currentYearRange();

  // Fetch MTD rows, YTD collections, and staff names in parallel
  const [mtdRes, ytdRes, staffRes] = await Promise.all([
    service
      .from("daily_numbers")
      .select("staff_id,date,calls_made,dms,connects,sets,shows,intro_units,major_units,sales,collections,commissions")
      .gte("date", mFrom)
      .lte("date", mTo),
    service
      .from("daily_numbers")
      .select("date,collections")
      .gte("date", yFrom)
      .lte("date", yTo),
    service
      .from("staff_accounts")
      .select("id,name"),
  ]);

  type MtdRow = {
    staff_id: string; date: string;
    calls_made: number; dms: number; connects: number;
    sets: number; shows: number; intro_units: number; major_units: number;
    sales: number; collections: number; commissions: number;
  };

  const mtdRows = (mtdRes.data ?? []) as MtdRow[];
  const ytdRows = (ytdRes.data ?? []) as Array<{ date: string; collections: number }>;
  const staffNames = new Map((staffRes.data ?? []).map(s => [s.id, s.name]));

  // Aggregate dashboard totals
  const cashMTD = mtdRows.reduce((s, r) => s + Number(r.collections), 0);
  const cashYTD = ytdRows.reduce((s, r) => s + Number(r.collections), 0);
  const dealsMTD = mtdRows.reduce((s, r) => s + Number(r.sales), 0);
  const setsMTD  = mtdRows.reduce((s, r) => s + Number(r.sets), 0);
  const cashTrend = buildCashTrend(ytdRows);

  const dashboard: DashboardMetrics = {
    cashCollectedMTD:    Math.round(cashMTD),
    netRevenueMTD:       Math.round(cashMTD),
    leadsThisMonth:      setsMTD,
    totalDealsClosed:    dealsMTD,
    costPerClose:        0,
    mrr:                 Math.round(cashMTD),
    cashCollectedYTD:    Math.round(cashYTD),
    totalRefundMTD:      0,
    avgLeadResponseTime: "N/A",
    cashTrend,
    mrrTrend:            [...cashTrend],
    deltas: {
      cashCollectedMTD: 0, netRevenueMTD: 0, leadsThisMonth: 0,
      totalDealsClosed: 0, costPerClose: 0, mrr: 0,
      cashCollectedYTD: 0, totalRefundMTD: 0,
    },
  };

  // Build per-rep stats
  const repMap = new Map<string, { name: string; rows: typeof mtdRows }>();
  for (const r of mtdRows) {
    const repName = staffNames.get(r.staff_id) ?? r.staff_id;
    if (!repMap.has(r.staff_id)) repMap.set(r.staff_id, { name: repName, rows: [] });
    repMap.get(r.staff_id)!.rows.push(r);
  }

  const REP_COLORS = ["#1D9E75", "#D8843A", "#D957A8", "#3B6FB5", "#8A5BC7", "#4a7ab5"];
  let ci = 0;
  const repStats: RepProductionStats[] = Array.from(repMap.entries()).map(([staffId, { name, rows }]) => {
    const sum = (key: keyof typeof rows[0]) => rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
    const set   = sum("sets");
    const show  = sum("shows");
    const sales = sum("sales");
    return {
      name,
      sheetId: REP_COLORS[ci++ % REP_COLORS.length], // reuse sheetId field as color (existing pattern)
      callsMade:  sum("calls_made"),
      dms:        sum("dms"),
      connects:   sum("connects"),
      set,
      show,
      introUnits: sum("intro_units"),
      majorUnits: sum("major_units"),
      sales,
      collections: sum("collections"),
      commissions: sum("commissions"),
      showRate:   set   > 0 ? Math.round((show  / set)   * 100) : 0,
      closeRate:  show  > 0 ? Math.round((sales / show)  * 100) : 0,
      callsTrend: buildCallsTrend(rows as { date: string; calls_made: number }[]),
    };
  });

  return { dashboard, repStats, live: true, lastFetched: new Date().toISOString() };
}
