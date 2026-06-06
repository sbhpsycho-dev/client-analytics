import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getRepProductionStats, getRepDailyNumbers, getAdminDashboardStats } from "@/lib/analytics/daily-numbers";
import { StaffDashboardClient } from "@/app/staff/StaffDashboardClient";
import { ImpersonateButton } from "./ImpersonateButton";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const sb = createServiceClient();
  const { data: member } = await sb
    .from("staff_accounts")
    .select("id, name, role")
    .eq("id", id)
    .single();

  if (!member) redirect("/admin/staff");

  const [prodStats, history, { repStats }] = await Promise.all([
    getRepProductionStats(member.id, member.name),
    getRepDailyNumbers(member.id),
    getAdminDashboardStats(),
  ]);

  const roleColor = "rgba(74,122,181,0.15)";
  const roleBorderColor = "rgba(74,122,181,0.3)";

  return (
    <div style={{ background: "linear-gradient(180deg, #0a1525 0%, #080f1e 100%)", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 px-6 py-3 text-sm flex-wrap"
        style={{
          background: "rgba(180,210,240,0.05)",
          borderBottom: "1px solid rgba(180,210,240,0.12)",
        }}>
        <Link href="/admin/staff"
          className="flex items-center gap-1.5 font-medium transition-opacity hover:opacity-70"
          style={{ color: "#7a9ab8" }}>
          <ArrowLeft className="h-4 w-4" />
          Back to Staff Roster
        </Link>
        <span style={{ color: "rgba(180,210,240,0.2)" }}>·</span>
        <span style={{ color: "#4a6a8a" }}>Previewing as</span>
        <span className="font-bold" style={{ color: "#dce8f4" }}>{member.name}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: roleColor, border: `1px solid ${roleBorderColor}`, color: "#7ab5f5" }}>
          {member.role}
        </span>
        <ImpersonateButton staffId={id} />
        <span className="ml-auto text-xs hidden sm:block" style={{ color: "#3a5a7a" }}>
          Admin view only — rep cannot see this banner
        </span>
      </div>

      <StaffDashboardClient
        prodStats={prodStats}
        history={history}
        repStats={repStats}
        role={member.role as "setter" | "closer"}
        repName={member.name}
      />
    </div>
  );
}
