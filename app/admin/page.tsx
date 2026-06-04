import { getSheetMetrics } from "@/lib/analytics/sheet-metrics";
import { DashboardClient } from "./DashboardClient";

export const revalidate = 30; // re-fetch sheet data every 5 minutes

export default async function DashboardPage() {
  const metrics = await getSheetMetrics();
  return (
    <DashboardClient
      metrics={metrics.dashboard}
      live={metrics.live}
      lastFetched={metrics.lastFetched}
    />
  );
}
