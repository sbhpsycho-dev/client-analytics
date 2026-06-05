import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStaffMetrics } from "@/lib/analytics/sheet-metrics";
import { StaffDashboardClient } from "@/app/staff/StaffDashboardClient";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const sb = createServiceClient();
  const { data: member } = await sb
    .from("staff_accounts")
    .select("id, name, role, sheet_id, sheet_tab")
    .eq("id", id)
    .single();

  if (!member) redirect("/admin/staff");

  const metrics = await getStaffMetrics(
    member.name,
    member.role as "setter" | "closer",
    member.sheet_id ?? undefined,
    member.sheet_tab ?? undefined
  );

  const roleColor = member.role === "closer" ? "#f97316" : "#22c55e";

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      {/* Admin preview banner */}
      <div className="flex items-center gap-3 px-6 py-3 text-sm"
        style={{ background: "rgba(249,115,22,0.1)", borderBottom: "1px solid rgba(249,115,22,0.2)" }}>
        <Link href="/admin/staff"
          className="flex items-center gap-1.5 font-medium transition-opacity hover:opacity-70"
          style={{ color: "#f97316" }}>
          <ArrowLeft className="h-4 w-4" />
          Back to Staff Roster
        </Link>
        <span style={{ color: "rgba(249,115,22,0.4)" }}>·</span>
        <span style={{ color: "#f97316" }}>Previewing as</span>
        <span className="font-bold" style={{ color: "#fff" }}>{member.name}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: `${roleColor}20`, border: `1px solid ${roleColor}40`, color: roleColor }}>
          {member.role}
        </span>
        <span className="ml-auto text-xs" style={{ color: "rgba(249,115,22,0.5)" }}>
          Admin view only — rep cannot see this banner
        </span>
      </div>

      {/* Rep dashboard */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <StaffDashboardClient metrics={metrics as any} role={member.role as "setter" | "closer"} repName={member.name} />
    </div>
  );
}
