import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStaffMetrics } from "@/lib/analytics/sheet-metrics";
import { StaffDashboardClient } from "./StaffDashboardClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isStaff) redirect("/login");

  const { name, staffRole, sheetId, sheetTab } = session.user;

  if (!staffRole || !name) redirect("/login");

  const metrics = await getStaffMetrics(name, staffRole, sheetId, sheetTab);

  return (
    <StaffDashboardClient
      metrics={metrics}
      role={staffRole}
      repName={name}
    />
  );
}
