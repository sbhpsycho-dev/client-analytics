import type { Tables } from "@/types/database";

type Call = Tables<"calls">;
type Lead = Tables<"leads">;

export interface DateRange {
  from: Date;
  to: Date;
}

export interface KPIs {
  callsBooked: number;
  callsShowed: number;
  noShows: number;
  reschedules: number;
  showRate: number;
  noShowRate: number;
  closeRate: number;
  cashCollected: number;
  contractValue: number;
  aov: number;
  pipelineValue: number;
  setterLeaderboard: SetterStat[];
  closerLeaderboard: CloserStat[];
  trends: TrendPoint[];
  funnel: Funnel;
}

export interface SetterStat {
  name: string;
  bookings: number;
  shows: number;
  showRate: number;
}

export interface CloserStat {
  name: string;
  closes: number;
  cashCollected: number;
  aov: number;
  closeRate: number;
}

export interface TrendPoint {
  date: string;
  callsBooked: number;
  revenue: number;
  showRate: number;
}

export interface Funnel {
  leads: number;
  booked: number;
  showed: number;
  closed: number;
}

function inRange(call: Call, range: DateRange): boolean {
  if (!call.date) return false;
  const d = new Date(call.date);
  return d >= range.from && d <= range.to;
}

export function computeKPIs(calls: Call[], leads: Lead[], range: DateRange): KPIs {
  const filtered = calls.filter((c) => !c.excluded && inRange(c, range));

  const callsBooked = filtered.filter((c) => c.status !== null).length;
  const callsShowed = filtered.filter((c) => c.status === "showed").length;
  const noShows = filtered.filter((c) => c.status === "no-show").length;
  const reschedules = filtered.filter((c) => c.status === "rescheduled").length;
  const closed = filtered.filter((c) => c.outcome === "closed");

  const showRate = callsBooked > 0 ? (callsShowed / callsBooked) * 100 : 0;
  const noShowRate = callsBooked > 0 ? (noShows / callsBooked) * 100 : 0;
  const closeRate = callsShowed > 0 ? (closed.length / callsShowed) * 100 : 0;

  const cashCollected = closed.reduce((s, c) => s + (c.cash_collected ?? 0), 0);
  const contractValue = closed.reduce((s, c) => s + (c.contract_value ?? 0), 0);
  const aov = closed.length > 0 ? cashCollected / closed.length : 0;

  const openPipeline = filtered.filter((c) => c.status === "booked" || c.status === "rescheduled");
  const pipelineValue = openPipeline.reduce((s, c) => s + (c.contract_value ?? 0), 0);

  // Setter leaderboard
  const setterMap = new Map<string, { bookings: number; shows: number }>();
  for (const c of filtered) {
    if (!c.setter) continue;
    const s = setterMap.get(c.setter) ?? { bookings: 0, shows: 0 };
    s.bookings++;
    if (c.status === "showed") s.shows++;
    setterMap.set(c.setter, s);
  }
  const setterLeaderboard: SetterStat[] = Array.from(setterMap.entries())
    .map(([name, { bookings, shows }]) => ({
      name,
      bookings,
      shows,
      showRate: bookings > 0 ? (shows / bookings) * 100 : 0,
    }))
    .sort((a, b) => b.bookings - a.bookings);

  // Closer leaderboard
  const closerMap = new Map<string, { closes: number; cash: number; shown: number }>();
  for (const c of filtered) {
    if (!c.closer) continue;
    const m = closerMap.get(c.closer) ?? { closes: 0, cash: 0, shown: 0 };
    if (c.status === "showed") m.shown++;
    if (c.outcome === "closed") {
      m.closes++;
      m.cash += c.cash_collected ?? 0;
    }
    closerMap.set(c.closer, m);
  }
  const closerLeaderboard: CloserStat[] = Array.from(closerMap.entries())
    .map(([name, { closes, cash, shown }]) => ({
      name,
      closes,
      cashCollected: cash,
      aov: closes > 0 ? cash / closes : 0,
      closeRate: shown > 0 ? (closes / shown) * 100 : 0,
    }))
    .sort((a, b) => b.cashCollected - a.cashCollected);

  // Daily trends
  const trendMap = new Map<string, { booked: number; revenue: number; showed: number }>();
  for (const c of filtered) {
    if (!c.date) continue;
    const d = c.date.slice(0, 10);
    const t = trendMap.get(d) ?? { booked: 0, revenue: 0, showed: 0 };
    t.booked++;
    if (c.status === "showed") t.showed++;
    if (c.outcome === "closed") t.revenue += c.cash_collected ?? 0;
    trendMap.set(d, t);
  }
  const trends: TrendPoint[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { booked, revenue, showed }]) => ({
      date,
      callsBooked: booked,
      revenue,
      showRate: booked > 0 ? (showed / booked) * 100 : 0,
    }));

  // Funnel
  const filteredLeads = leads.filter((l) => {
    if (!l.date || l.excluded) return false;
    const d = new Date(l.date);
    return d >= range.from && d <= range.to;
  });

  const funnel: Funnel = {
    leads: filteredLeads.length,
    booked: callsBooked,
    showed: callsShowed,
    closed: closed.length,
  };

  return {
    callsBooked,
    callsShowed,
    noShows,
    reschedules,
    showRate: parseFloat(showRate.toFixed(1)),
    noShowRate: parseFloat(noShowRate.toFixed(1)),
    closeRate: parseFloat(closeRate.toFixed(1)),
    cashCollected,
    contractValue,
    aov,
    pipelineValue,
    setterLeaderboard,
    closerLeaderboard,
    trends,
    funnel,
  };
}
