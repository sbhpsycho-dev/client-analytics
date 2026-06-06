import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getRepProductionStats, getRepDailyNumbers } from "@/lib/analytics/daily-numbers";
import { StaffDashboardClient } from "./StaffDashboardClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isStaff) redirect("/login");

  const { name, staffRole, staffId } = session.user;
  if (!staffRole || !name || !staffId) redirect("/login");

  const [prodStats, history] = await Promise.all([
    getRepProductionStats(staffId, name),
    getRepDailyNumbers(staffId),
  ]);

  return (
    <StaffDashboardClient
      prodStats={prodStats}
      history={history}
      role={staffRole}
      repName={name}
    />
  );
}
