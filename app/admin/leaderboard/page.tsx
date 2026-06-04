import { getSheetMetrics } from "@/lib/analytics/sheet-metrics";
import { LeaderboardClient } from "./LeaderboardClient";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const metrics = await getSheetMetrics();
  return (
    <LeaderboardClient
      reps={metrics.leaderboard}
      live={metrics.live}
      lastFetched={metrics.lastFetched}
    />
  );
}
