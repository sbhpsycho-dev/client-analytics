import { sheetGet, sheetMeta } from "@/lib/google/api-key-reader";

const SHEET_ID = "1WhqtK3CHsoiiUs5kiLZ64Lig1WTZpAo-OVeKhMuyWCs";

const REP_COLORS = ["#1D9E75", "#D8843A", "#D957A8", "#3B6FB5", "#8A5BC7", "#4a7ab5"];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  cashCollectedMTD: number;
  netRevenueMTD: number;
  leadsThisMonth: number;
  totalDealsClosed: number;
  costPerClose: number;
  mrr: number;
  cashCollectedYTD: number;
  totalRefundMTD: number;
  avgLeadResponseTime: string;
  cashTrend: number[];
  mrrTrend: number[];
  deltas: Record<string, number>;
}

export interface PipelineRep {
  name: string;
  color: string;
  callsMade: number;
  callsAnswered: number;
  demosSet: number;
  demosShowed: number;
  pitched: number;
  closed: number;
}

export interface LeaderboardRep {
  name: string;
  color: string;
  cashCollected: number;
  dealsClosed: number;
  callsMade: number;
  closeRate: number;
  avgDealSize: number;
}

export interface SetterStats {
  name: string;
  callsBooked: number;
  demosShowed: number;
  noShows: number;
  showRate: number;
  rankAmongSetters: number;
  totalSetters: number;
  bookingTrend: number[];
}

export interface CloserStats {
  name: string;
  cashCollected: number;
  dealsClosed: number;
  closeRate: number;
  avgDealSize: number;
  rankAmongClosers: number;
  totalClosers: number;
  cashTrend: number[];
}

export interface RepSheetConfig {
  sheetId: string;
  tab: string;
  repName: string;
}

export interface SheetMetrics {
  dashboard: DashboardMetrics;
  pipeline: PipelineRep[];
  leaderboard: LeaderboardRep[];
  setterStats: SetterStats[];
  closerStats: CloserStats[];
  live: boolean;
  lastFetched: string;
}

// ── Mock fallback data ────────────────────────────────────────────────────────

const MOCK_DASHBOARD: DashboardMetrics = {
  cashCollectedMTD:    73_200,
  netRevenueMTD:       68_400,
  leadsThisMonth:      214,
  totalDealsClosed:    11,
  costPerClose:        850,
  mrr:                 41_200,
  cashCollectedYTD:   312_800,
  totalRefundMTD:      4_800,
  avgLeadResponseTime: "4m 32s",
  cashTrend: [52_000, 54_600, 61_000, 65_100, 70_400, 73_200],
  mrrTrend:  [36_400, 37_800, 39_100, 40_200, 40_800, 41_200],
  deltas: {
    cashCollectedMTD: 8.5, netRevenueMTD: 7.9, leadsThisMonth: 12,
    totalDealsClosed: 2, costPerClose: -5.2, mrr: 3.8,
    cashCollectedYTD: 22.1, totalRefundMTD: 1.4,
  },
};

const MOCK_PIPELINE: PipelineRep[] = [
  { name: "Sylis",   color: "#1D9E75", callsMade: 210, callsAnswered: 147, demosSet: 52, demosShowed: 38, pitched: 35, closed: 11 },
  { name: "Izaiah",  color: "#D8843A", callsMade: 185, callsAnswered: 120, demosSet: 44, demosShowed: 30, pitched: 27, closed:  9 },
  { name: "Celest",  color: "#D957A8", callsMade: 162, callsAnswered: 108, demosSet: 39, demosShowed: 27, pitched: 24, closed:  7 },
  { name: "Harneet", color: "#3B6FB5", callsMade:  95, callsAnswered:  68, demosSet: 28, demosShowed: 22, pitched: 20, closed:  8 },
];

const MOCK_LEADERBOARD: LeaderboardRep[] = [
  { name: "Sylis",   color: "#1D9E75", cashCollected: 27_400, dealsClosed: 4, callsMade: 210, closeRate: 31, avgDealSize: 6_850 },
  { name: "Izaiah",  color: "#D8843A", cashCollected: 25_800, dealsClosed: 4, callsMade: 185, closeRate: 33, avgDealSize: 6_450 },
  { name: "Celest",  color: "#D957A8", cashCollected: 20_000, dealsClosed: 3, callsMade: 162, closeRate: 29, avgDealSize: 6_667 },
  { name: "Harneet", color: "#3B6FB5", cashCollected: 19_400, dealsClosed: 2, callsMade:  95, closeRate: 40, avgDealSize: 9_700 },
];

const MOCK_SETTER_STATS: SetterStats[] = [
  { name: "Sylis",  callsBooked: 52, demosShowed: 38, noShows: 14, showRate: 73, rankAmongSetters: 1, totalSetters: 2, bookingTrend: [8,9,10,8,9,8] },
  { name: "Celest", callsBooked: 39, demosShowed: 27, noShows: 12, showRate: 69, rankAmongSetters: 2, totalSetters: 2, bookingTrend: [6,7,6,7,6,7] },
];

const MOCK_CLOSER_STATS: CloserStats[] = [
  { name: "Izaiah",  cashCollected: 25_800, dealsClosed: 4, closeRate: 33, avgDealSize: 6_450, rankAmongClosers: 1, totalClosers: 2, cashTrend: [4000,5000,5500,5800,5000,6500] },
  { name: "Harneet", cashCollected: 19_400, dealsClosed: 2, closeRate: 40, avgDealSize: 9_700, rankAmongClosers: 2, totalClosers: 2, cashTrend: [2000,3000,3500,4000,3200,3700] },
];

// ── Column detection ──────────────────────────────────────────────────────────

const COL_PATTERNS: Record<string, string[]> = {
  date:    ["date", "call date", "scheduled", "appointment", "time"],
  setter:  ["setter", "set by", "booked by", "agent", "rep", "name"],
  closer:  ["closer", "close by", "closed by", "sales rep", "account exec"],
  outcome: ["outcome", "result", "disposition", "won", "lost"],
  status:  ["status", "call status", "showed", "show"],
  cash:    ["cash", "collected", "payment", "paid", "amount", "revenue", "sale"],
  contract:["contract", "deal value", "contract value"],
};

function detectCols(headers: string[]): Record<string, number> {
  const lower = headers.map(h => (h ?? "").toLowerCase().trim());
  const result: Record<string, number> = {};
  for (const [field, patterns] of Object.entries(COL_PATTERNS)) {
    for (const pattern of patterns) {
      const idx = lower.findIndex(h => h.includes(pattern));
      if (idx !== -1) { result[field] = idx; break; }
    }
  }
  return result;
}

// ── Value parsers ─────────────────────────────────────────────────────────────

function parseCash(val: string): number {
  if (!val) return 0;
  const num = parseFloat((val ?? "").replace(/[$,\s]/g, ""));
  return isNaN(num) ? 0 : num;
}

function parseRowDate(val: string): Date | null {
  if (!val) return null;
  const serial = Number(val);
  if (!isNaN(serial) && serial > 40_000 && serial < 60_000) {
    return new Date((serial - 25569) * 86_400_000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeOutcome(val: string): string {
  const v = (val ?? "").toLowerCase().trim();
  if (["closed", "won", "close", "sale", "sold", "yes"].some(p => v.includes(p))) return "closed";
  if (["lost", "no sale", "no deal", "no"].some(p => v.includes(p))) return "lost";
  if (["follow", "f/u", "fu", "cb"].some(p => v.includes(p))) return "follow-up";
  return v;
}

function normalizeStatus(val: string): string {
  const v = (val ?? "").toLowerCase().trim();
  if (["no show", "no-show", "noshow", "absent", "ns"].some(p => v.includes(p))) return "no-show";
  if (["cancel", "cancelled", "canceled"].some(p => v.includes(p))) return "canceled";
  if (["show", "showed", "attended", "appeared", "came"].some(p => v.includes(p))) return "showed";
  if (["book", "booked", "scheduled", "set", "confirmed"].some(p => v.includes(p))) return "booked";
  return v;
}

// ── Weekly bucketing ──────────────────────────────────────────────────────────

function getWeekKey(d: Date): string {
  const copy = new Date(d);
  copy.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return copy.toISOString().slice(0, 10);
}

// ── Row parsing ───────────────────────────────────────────────────────────────

interface ParsedRow {
  date: Date | null;
  setter: string;
  closer: string;
  outcome: string;
  status: string;
  cash: number;
}

function parseRows(data: string[][], cols: Record<string, number>): ParsedRow[] {
  return data.map(row => ({
    date:    parseRowDate(cols.date    != null ? (row[cols.date]    ?? "") : ""),
    setter:  ((cols.setter  != null ? (row[cols.setter]  ?? "") : "")).trim(),
    closer:  ((cols.closer  != null ? (row[cols.closer]  ?? "") : "")).trim(),
    outcome: normalizeOutcome(cols.outcome != null ? (row[cols.outcome] ?? "") : ""),
    status:  normalizeStatus(cols.status   != null ? (row[cols.status]  ?? "") : ""),
    cash:    parseCash(cols.cash != null ? (row[cols.cash] ?? "") : ""),
  })).filter(r => r.setter || r.closer || r.cash > 0);
}

// ── Fetch rows from a single sheet tab ───────────────────────────────────────

function hasGoogleAuth(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_API_KEY);
}

function parseEnvRepSheets(): RepSheetConfig[] | undefined {
  try {
    const raw = process.env.LEADWELL_REP_SHEETS;
    if (!raw) return undefined;
    return JSON.parse(raw) as RepSheetConfig[];
  } catch {
    return undefined;
  }
}

async function fetchSheetRows(sheetId: string, tabName?: string): Promise<ParsedRow[]> {
  if (!hasGoogleAuth()) return [];

  let tab = tabName;
  if (!tab) {
    const tabs = await sheetMeta(sheetId);
    if (tabs.length === 0) return [];
    const lower = tabs.map(t => t.toLowerCase());
    const PREFERRED_TABS = ["calls", "all calls", "data", "pipeline", "sales", "main", "sheet1"];
    tab = tabs[0];
    for (const pref of PREFERRED_TABS) {
      const idx = lower.findIndex(t => t.includes(pref));
      if (idx !== -1) { tab = tabs[idx]; break; }
    }
  }

  const raw = await sheetGet(sheetId, `${tab}!A:Z`);
  if (raw.length < 2) return [];

  const headers = raw[0].map(h => h?.toString() ?? "");
  const cols    = detectCols(headers);
  return parseRows(raw.slice(1), cols);
}

// ── Metric computers ──────────────────────────────────────────────────────────

function computeDashboard(rows: ParsedRow[]): DashboardMetrics {
  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();

  const mtd = rows.filter(r => r.date && r.date.getMonth() === cm && r.date.getFullYear() === cy);
  const ytd = rows.filter(r => r.date && r.date.getFullYear() === cy);

  const cashMTD = mtd.filter(r => r.outcome === "closed").reduce((s, r) => s + r.cash, 0);
  const cashYTD = ytd.filter(r => r.outcome === "closed").reduce((s, r) => s + r.cash, 0);

  const buckets: Record<string, number> = {};
  rows.filter(r => r.date && r.outcome === "closed").forEach(r => {
    const k = getWeekKey(r.date!);
    buckets[k] = (buckets[k] ?? 0) + r.cash;
  });
  const sortedWeeks = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const cashTrend = sortedWeeks.map(([, v]) => v);
  while (cashTrend.length < 6) cashTrend.unshift(0);

  return {
    cashCollectedMTD: cashMTD,
    netRevenueMTD:    cashMTD,
    leadsThisMonth:   mtd.length,
    totalDealsClosed: mtd.filter(r => r.outcome === "closed").length,
    costPerClose:     0,
    mrr:              cashMTD,
    cashCollectedYTD: cashYTD,
    totalRefundMTD:   0,
    avgLeadResponseTime: "N/A",
    cashTrend,
    mrrTrend: [...cashTrend],
    deltas: {
      cashCollectedMTD: 0, netRevenueMTD: 0, leadsThisMonth: 0,
      totalDealsClosed: 0, costPerClose: 0, mrr: 0,
      cashCollectedYTD: 0, totalRefundMTD: 0,
    },
  };
}

function computePipeline(rows: ParsedRow[]): PipelineRep[] {
  const repMap: Record<string, ParsedRow[]> = {};
  rows.forEach(r => {
    const name = r.setter || r.closer;
    if (!name) return;
    (repMap[name] ??= []).push(r);
  });

  let ci = 0;
  return Object.entries(repMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rr]) => ({
      name,
      color:         REP_COLORS[ci++ % REP_COLORS.length],
      callsMade:     rr.length,
      callsAnswered: rr.filter(r => !["no-show", "canceled"].includes(r.status)).length,
      demosSet:      rr.filter(r => ["showed", "booked"].includes(r.status)).length,
      demosShowed:   rr.filter(r => r.status === "showed").length,
      pitched:       rr.filter(r => ["closed", "lost", "follow-up"].includes(r.outcome)).length,
      closed:        rr.filter(r => r.outcome === "closed").length,
    }));
}

function computeLeaderboard(rows: ParsedRow[]): LeaderboardRep[] {
  const repMap: Record<string, ParsedRow[]> = {};
  rows.forEach(r => {
    const name = r.setter || r.closer;
    if (!name) return;
    (repMap[name] ??= []).push(r);
  });

  let ci = 0;
  return Object.entries(repMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rr]) => {
      const closed = rr.filter(r => r.outcome === "closed");
      const cashCollected = closed.reduce((s, r) => s + r.cash, 0);
      const dealsClosed   = closed.length;
      const callsMade     = rr.length;
      return {
        name,
        color:        REP_COLORS[ci++ % REP_COLORS.length],
        cashCollected,
        dealsClosed,
        callsMade,
        closeRate:    callsMade > 0 ? Math.round((dealsClosed / callsMade) * 100) : 0,
        avgDealSize:  dealsClosed > 0 ? Math.round(cashCollected / dealsClosed) : 0,
      };
    });
}

function computeSetterStats(rows: ParsedRow[]): SetterStats[] {
  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();
  const mtd = rows.filter(r => r.date && r.date.getMonth() === cm && r.date.getFullYear() === cy);

  // Find all unique setter names
  const setterNames = [...new Set(rows.filter(r => r.setter).map(r => r.setter))];

  const stats = setterNames.map(name => {
    const myRows = mtd.filter(r => r.setter === name);
    const demosShowed = myRows.filter(r => r.status === "showed").length;
    const noShows     = myRows.filter(r => r.status === "no-show").length;
    const callsBooked = myRows.length;

    // 6-week booking trend
    const buckets: Record<string, number> = {};
    rows.filter(r => r.setter === name && r.date).forEach(r => {
      const k = getWeekKey(r.date!);
      buckets[k] = (buckets[k] ?? 0) + 1;
    });
    const sortedWeeks = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const bookingTrend = sortedWeeks.map(([, v]) => v);
    while (bookingTrend.length < 6) bookingTrend.unshift(0);

    return {
      name,
      callsBooked,
      demosShowed,
      noShows,
      showRate: callsBooked > 0 ? Math.round((demosShowed / callsBooked) * 100) : 0,
      bookingTrend,
      rankAmongSetters: 0,
      totalSetters: setterNames.length,
    };
  });

  // Assign ranks by calls booked desc
  stats.sort((a, b) => b.callsBooked - a.callsBooked);
  stats.forEach((s, i) => { s.rankAmongSetters = i + 1; });

  return stats;
}

function computeCloserStats(rows: ParsedRow[]): CloserStats[] {
  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();
  const mtd = rows.filter(r => r.date && r.date.getMonth() === cm && r.date.getFullYear() === cy);

  const closerNames = [...new Set(rows.filter(r => r.closer).map(r => r.closer))];

  const stats = closerNames.map(name => {
    const myRows   = mtd.filter(r => r.closer === name);
    const closed   = myRows.filter(r => r.outcome === "closed");
    const cashCollected = closed.reduce((s, r) => s + r.cash, 0);
    const dealsClosed   = closed.length;
    const callsMade     = myRows.length;

    // 6-week cash trend
    const buckets: Record<string, number> = {};
    rows.filter(r => r.closer === name && r.date && r.outcome === "closed").forEach(r => {
      const k = getWeekKey(r.date!);
      buckets[k] = (buckets[k] ?? 0) + r.cash;
    });
    const sortedWeeks = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const cashTrend = sortedWeeks.map(([, v]) => v);
    while (cashTrend.length < 6) cashTrend.unshift(0);

    return {
      name,
      cashCollected,
      dealsClosed,
      closeRate:    callsMade > 0 ? Math.round((dealsClosed / callsMade) * 100) : 0,
      avgDealSize:  dealsClosed > 0 ? Math.round(cashCollected / dealsClosed) : 0,
      cashTrend,
      rankAmongClosers: 0,
      totalClosers: closerNames.length,
    };
  });

  // Assign ranks by cash collected desc
  stats.sort((a, b) => b.cashCollected - a.cashCollected);
  stats.forEach((s, i) => { s.rankAmongClosers = i + 1; });

  return stats;
}

// ── Main export ───────────────────────────────────────────────────────────────

const PREFERRED_TABS = ["calls", "all calls", "data", "pipeline", "sales", "main", "sheet1"];

export async function getSheetMetrics(repSheets?: RepSheetConfig[]): Promise<SheetMetrics> {
  const fallback: SheetMetrics = {
    dashboard:   MOCK_DASHBOARD,
    pipeline:    MOCK_PIPELINE,
    leaderboard: MOCK_LEADERBOARD,
    setterStats: MOCK_SETTER_STATS,
    closerStats: MOCK_CLOSER_STATS,
    live: false,
    lastFetched: new Date().toISOString(),
  };

  try {
    if (!hasGoogleAuth()) return fallback;

    // Auto-load rep sheets from env if caller didn't provide them
    const sheets = repSheets ?? parseEnvRepSheets();

    let allRows: ParsedRow[] = [];

    if (sheets && sheets.length > 0) {
      // Aggregate rows from each rep's individual sheet
      const perRepRows = await Promise.all(
        sheets.map(({ sheetId, tab }) => fetchSheetRows(sheetId, tab || undefined))
      );
      allRows = perRepRows.flat();
    } else {
      // Fall back to the master sheet
      const tabs = await sheetMeta(SHEET_ID);
      if (tabs.length === 0) return fallback;

      const lower = tabs.map(t => t.toLowerCase());
      let tabName = tabs[0];
      for (const pref of PREFERRED_TABS) {
        const idx = lower.findIndex(t => t.includes(pref));
        if (idx !== -1) { tabName = tabs[idx]; break; }
      }

      const raw = await sheetGet(SHEET_ID, `${tabName}!A:Z`);
      if (raw.length < 2) return fallback;

      const headers = raw[0].map(h => h?.toString() ?? "");
      const cols    = detectCols(headers);
      allRows = parseRows(raw.slice(1), cols);
    }

    if (allRows.length === 0) return fallback;

    const pipeline    = computePipeline(allRows);
    const leaderboard = computeLeaderboard(allRows);
    const dashboard   = computeDashboard(allRows);
    const setterStats = computeSetterStats(allRows);
    const closerStats = computeCloserStats(allRows);

    if (pipeline.length === 0 && dashboard.leadsThisMonth === 0) return fallback;

    return {
      dashboard,
      pipeline:    pipeline.length    > 0 ? pipeline    : MOCK_PIPELINE,
      leaderboard: leaderboard.length > 0 ? leaderboard : MOCK_LEADERBOARD,
      setterStats: setterStats.length > 0 ? setterStats : MOCK_SETTER_STATS,
      closerStats: closerStats.length > 0 ? closerStats : MOCK_CLOSER_STATS,
      live: true,
      lastFetched: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}

// ── Per-staff metrics (for individual rep dashboards) ─────────────────────────

export async function getStaffMetrics(
  staffName: string,
  role: "setter" | "closer",
  sheetId?: string,
  sheetTab?: string
): Promise<SetterStats | CloserStats> {
  try {
    let rows: ParsedRow[] = [];

    if (sheetId && hasGoogleAuth()) {
      rows = await fetchSheetRows(sheetId, sheetTab);
    }

    // If we didn't get rows from a personal sheet, fall back to master sheet
    if (rows.length === 0 && hasGoogleAuth()) {
      rows = await fetchSheetRows(SHEET_ID);
    }

    if (rows.length === 0) {
      // Return mock data for this rep
      if (role === "setter") {
        return MOCK_SETTER_STATS.find(s => s.name === staffName) ?? {
          name: staffName, callsBooked: 0, demosShowed: 0, noShows: 0,
          showRate: 0, rankAmongSetters: 1, totalSetters: 1, bookingTrend: [0,0,0,0,0,0],
        };
      }
      return MOCK_CLOSER_STATS.find(s => s.name === staffName) ?? {
        name: staffName, cashCollected: 0, dealsClosed: 0, closeRate: 0,
        avgDealSize: 0, rankAmongClosers: 1, totalClosers: 1, cashTrend: [0,0,0,0,0,0],
      };
    }

    if (role === "setter") {
      const all = computeSetterStats(rows);
      return all.find(s => s.name === staffName) ?? {
        name: staffName, callsBooked: 0, demosShowed: 0, noShows: 0,
        showRate: 0, rankAmongSetters: all.length + 1, totalSetters: all.length + 1,
        bookingTrend: [0,0,0,0,0,0],
      };
    }

    const all = computeCloserStats(rows);
    return all.find(s => s.name === staffName) ?? {
      name: staffName, cashCollected: 0, dealsClosed: 0, closeRate: 0,
      avgDealSize: 0, rankAmongClosers: all.length + 1, totalClosers: all.length + 1,
      cashTrend: [0,0,0,0,0,0],
    };
  } catch {
    if (role === "setter") {
      return {
        name: staffName, callsBooked: 0, demosShowed: 0, noShows: 0,
        showRate: 0, rankAmongSetters: 1, totalSetters: 1, bookingTrend: [0,0,0,0,0,0],
      };
    }
    return {
      name: staffName, cashCollected: 0, dealsClosed: 0, closeRate: 0,
      avgDealSize: 0, rankAmongClosers: 1, totalClosers: 1, cashTrend: [0,0,0,0,0,0],
    };
  }
}
