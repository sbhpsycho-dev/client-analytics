import { getAdminDashboardStats } from "@/lib/analytics/daily-numbers";
import type { LeaderboardRep } from "@/lib/analytics/sheet-metrics";
import { LeaderboardClient } from "./LeaderboardClient";

export const dynamic = "force-dynamic";

const REP_COLORS = ["#1D9E75", "#D8843A", "#D957A8", "#3B6FB5", "#8A5BC7", "#4a7ab5"];

export default async function LeaderboardPage() {
  const { repStats, live, lastFetched } = await getAdminDashboardStats();

  const reps: LeaderboardRep[] = repStats.map((r, i) => ({
    name:          r.name,
    color:         REP_COLORS[i % REP_COLORS.length],
    cashCollected: r.collections,
    dealsClosed:   r.sales,
    callsMade:     r.callsMade,
    closeRate:     r.closeRate,
    avgDealSize:   r.sales > 0 ? Math.round(r.collections / r.sales) : 0,
  }));

  return (
    <LeaderboardClient
      reps={reps}
      live={live}
      lastFetched={lastFetched}
    />
  );
}
