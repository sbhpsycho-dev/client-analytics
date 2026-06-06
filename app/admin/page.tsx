import { getAdminDashboardStats } from "@/lib/analytics/daily-numbers";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { dashboard, live, lastFetched } = await getAdminDashboardStats();
  return (
    <DashboardClient
      metrics={dashboard}
      live={live}
      lastFetched={lastFetched}
    />
  );
}
