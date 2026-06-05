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

export interface RepProductionStats {
  name: string;
  sheetId: string;
  callsMade: number;    // col B — Calls Made
  dms: number;          // col C — DMs
  connects: number;     // col D — Call Connects
  set: number;          // col E — Appointment Sets
  show: number;         // col F — Demos Showed
  sales: number;        // col I — Sales (deals closed)
  collections: number;  // col J — Collections (cash)
  showRate: number;     // show / set * 100
  closeRate: number;    // sales / show * 100
  callsTrend: number[]; // daily callsMade for current month
}

export interface SheetMetrics {
  dashboard: DashboardMetrics;
  pipeline: PipelineRep[];
  leaderboard: LeaderboardRep[];
  setterStats: SetterStats[];
  closerStats: CloserStats[];
  repStats: RepProductionStats[];
  live: boolean;
  lastFetched: string;
}

// ── Empty fallback (shown when no sheets are connected) ───────────────────────

const MOCK_DASHBOARD: DashboardMetrics = {
  cashCollectedMTD:    0,
  netRevenueMTD:       0,
  leadsThisMonth:      0,
  totalDealsClosed:    0,
  costPerClose:        0,
  mrr:                 0,
  cashCollectedYTD:    0,
  totalRefundMTD:      0,
  avgLeadResponseTime: "—",
  cashTrend: [0, 0, 0, 0, 0, 0],
  mrrTrend:  [0, 0, 0, 0, 0, 0],
  deltas: {
    cashCollectedMTD: 0, netRevenueMTD: 0, leadsThisMonth: 0,
    totalDealsClosed: 0, costPerClose: 0, mrr: 0,
    cashCollectedYTD: 0, totalRefundMTD: 0,
  },
};

const MOCK_PIPELINE: PipelineRep[] = [];

const MOCK_LEADERBOARD: LeaderboardRep[] = [];

const MOCK_SETTER_STATS: SetterStats[] = [];

const MOCK_CLOSER_STATS: CloserStats[] = [];

const MOCK_REP_STATS: RepProductionStats[] = [];

// ── Production sheet helpers ──────────────────────────────────────────────────

const MONTH_NAMES = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                     "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

function getCurrentMonthTab(): string {
  return MONTH_NAMES[new Date().getMonth()];
}

function isProductionSheet(tabs: string[]): boolean {
  const upper = tabs.map(t => t.toUpperCase().trim());
  return MONTH_NAMES.some(m => upper.includes(m));
}

// Production sheet row: Day of Month | Calls Made | DMs | Call Connects | Appointment Sets | Demos Showed | Intro Units | Major Units | Sales | Collections | Terms/Status | Commissions
interface ProductionRow {
  day: number;
  callsMade: number;
  dms: number;
  connects: number;
  set: number;
  show: number;
  sales: number;
  collections: number;
}

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.toString().replace(/[$,%,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseProductionSheetRows(raw: string[][]): ProductionRow[] {
  // Row 0: company name, Row 1: headers, Rows 2+: daily data
  const rows: ProductionRow[] = [];
  for (let i = 2; i < raw.length; i++) {
    const r = raw[i];
    const dayVal = (r[0] ?? "").toString().trim();
    const day = parseFloat(dayVal);
    if (isNaN(day) || day < 1 || day > 31) continue; // skip totals/empty rows
    rows.push({
      day,
      callsMade:   parseNum(r[1]),
      dms:         parseNum(r[2]),
      connects:    parseNum(r[3]),
      set:         parseNum(r[4]),
      show:        parseNum(r[5]),
      sales:       parseNum(r[8]),
      collections: parseNum(r[9]),
    });
  }
  return rows;
}

function computeRepProductionStats(
  rows: ProductionRow[],
  name: string,
  sheetId: string
): RepProductionStats {
  const sum = (field: keyof ProductionRow) =>
    rows.reduce((s, r) => s + (r[field] as number), 0);

  const set   = sum("set");
  const show  = sum("show");
  const sales = sum("sales");
  const callsTrend = rows.slice(0, 31).map(r => r.callsMade);

  return {
    name,
    sheetId,
    callsMade:   sum("callsMade"),
    dms:         sum("dms"),
    connects:    sum("connects"),
    set,
    show,
    sales,
    collections: sum("collections"),
    showRate:    set   > 0 ? Math.round((show  / set)   * 100) : 0,
    closeRate:   show  > 0 ? Math.round((sales / show)  * 100) : 0,
    callsTrend,
  };
}

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

// ── Metrics builders ──────────────────────────────────────────────────────────

function buildLegacyMetrics(allRows: ParsedRow[]): SheetMetrics {
  const pipeline    = computePipeline(allRows);
  const leaderboard = computeLeaderboard(allRows);
  const dashboard   = computeDashboard(allRows);
  const setterStats = computeSetterStats(allRows);
  const closerStats = computeCloserStats(allRows);
  return {
    dashboard,
    pipeline:    pipeline.length    > 0 ? pipeline    : MOCK_PIPELINE,
    leaderboard: leaderboard.length > 0 ? leaderboard : MOCK_LEADERBOARD,
    setterStats: setterStats.length > 0 ? setterStats : MOCK_SETTER_STATS,
    closerStats: closerStats.length > 0 ? closerStats : MOCK_CLOSER_STATS,
    repStats:    [],
    live: true,
    lastFetched: new Date().toISOString(),
  };
}

async function getProductionMetrics(sheets: RepSheetConfig[]): Promise<SheetMetrics> {
  const monthTab = getCurrentMonthTab();

  const perRep = await Promise.all(
    sheets.map(async ({ sheetId, repName }, i) => {
      const raw = await sheetGet(sheetId, `${monthTab}!A:L`);
      const rows = parseProductionSheetRows(raw);
      return computeRepProductionStats(rows, repName || `Rep ${i + 1}`, sheetId);
    })
  );

  const total = (field: keyof RepProductionStats) =>
    perRep.reduce((s, r) => s + (typeof r[field] === "number" ? (r[field] as number) : 0), 0);

  const totalCollections = total("collections");
  const totalSales       = total("sales");

  const dashboard: DashboardMetrics = {
    cashCollectedMTD:    totalCollections,
    netRevenueMTD:       totalCollections,
    leadsThisMonth:      total("set"),
    totalDealsClosed:    totalSales,
    costPerClose:        0,
    mrr:                 totalCollections,
    cashCollectedYTD:    totalCollections,
    totalRefundMTD:      0,
    avgLeadResponseTime: "—",
    cashTrend:           [0, 0, 0, 0, 0, totalCollections],
    mrrTrend:            [0, 0, 0, 0, 0, totalCollections],
    deltas: {
      cashCollectedMTD: 0, netRevenueMTD: 0, leadsThisMonth: 0,
      totalDealsClosed: 0, costPerClose: 0, mrr: 0,
      cashCollectedYTD: 0, totalRefundMTD: 0,
    },
  };

  const pipeline: PipelineRep[] = perRep.map((r, i) => ({
    name:          r.name,
    color:         REP_COLORS[i % REP_COLORS.length],
    callsMade:     r.callsMade,
    callsAnswered: r.connects,
    demosSet:      r.set,
    demosShowed:   r.show,
    pitched:       r.show,
    closed:        r.sales,
  }));

  const leaderboard: LeaderboardRep[] = perRep
    .sort((a, b) => b.collections - a.collections)
    .map((r, i) => ({
      name:         r.name,
      color:        REP_COLORS[i % REP_COLORS.length],
      cashCollected:r.collections,
      dealsClosed:  r.sales,
      callsMade:    r.callsMade,
      closeRate:    r.callsMade > 0 ? Math.round((r.sales / r.callsMade) * 100) : 0,
      avgDealSize:  r.sales > 0 ? Math.round(r.collections / r.sales) : 0,
    }));

  return {
    dashboard,
    pipeline,
    leaderboard,
    setterStats: [],
    closerStats: [],
    repStats:    perRep,
    live: true,
    lastFetched: new Date().toISOString(),
  };
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
    repStats:    MOCK_REP_STATS,
    live: false,
    lastFetched: new Date().toISOString(),
  };

  try {
    if (!hasGoogleAuth()) return fallback;

    // Auto-load rep sheets from env if caller didn't provide them
    const sheets = repSheets ?? parseEnvRepSheets();

    if (sheets && sheets.length > 0) {
      // Check if these are production sheets (month-named tabs)
      const firstTabs = await sheetMeta(sheets[0].sheetId);
      if (isProductionSheet(firstTabs)) {
        return await getProductionMetrics(sheets);
      }

      // Legacy setter/closer format
      const perRepRows = await Promise.all(
        sheets.map(({ sheetId, tab }) => fetchSheetRows(sheetId, tab || undefined))
      );
      const allRows = perRepRows.flat();
      if (allRows.length === 0) return fallback;
      return buildLegacyMetrics(allRows);
    }

    // Fall back to master sheet (legacy format)
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
    const allRows = parseRows(raw.slice(1), cols);
    if (allRows.length === 0) return fallback;
    return buildLegacyMetrics(allRows);
  } catch {
    return fallback;
  }
}

function emptyRepStats(name: string, sheetId: string): RepProductionStats {
  return {
    name, sheetId,
    callsMade: 0, dms: 0, connects: 0,
    set: 0, show: 0, sales: 0, collections: 0,
    showRate: 0, closeRate: 0,
    callsTrend: [],
  };
}

// ── Per-staff metrics (for individual rep dashboards) ─────────────────────────

export async function getStaffMetrics(
  staffName: string,
  role: "setter" | "closer",
  sheetId?: string,
  sheetTab?: string
): Promise<SetterStats | CloserStats | RepProductionStats> {
  try {
    // Check if this is a production sheet
    if (sheetId && hasGoogleAuth()) {
      const tabs = await sheetMeta(sheetId);
      if (isProductionSheet(tabs)) {
        const monthTab = getCurrentMonthTab();
        const raw = await sheetGet(sheetId, `${monthTab}!A:L`);
        const rows = parseProductionSheetRows(raw);
        return computeRepProductionStats(rows, staffName, sheetId);
      }
      // Also try as a non-monthly sheet (fall through to legacy below)

    }

    let rows: ParsedRow[] = [];

    if (sheetId && hasGoogleAuth()) {
      rows = await fetchSheetRows(sheetId, sheetTab);
    }

    // If we didn't get rows from a personal sheet, fall back to master sheet
    if (rows.length === 0 && hasGoogleAuth()) {
      rows = await fetchSheetRows(SHEET_ID);
    }

    if (rows.length === 0) {
      // Return empty production stats
      return emptyRepStats(staffName, sheetId ?? "");
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
    return emptyRepStats(staffName, sheetId ?? "");
  }
}
