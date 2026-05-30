import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users2, Mail, CheckCircle, XCircle } from "lucide-react";

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  setter:   { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  closer:   { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  manager:  { bg: "rgba(249,115,22,0.15)",  text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  director: { bg: "rgba(20,184,166,0.15)",  text: "#2dd4bf", border: "rgba(20,184,166,0.25)" },
  va:       { bg: "rgba(234,179,8,0.15)",   text: "#fbbf24", border: "rgba(234,179,8,0.25)" },
};

const ROLE_ORDER = ["director", "manager", "closer", "setter", "va"];

type TeamMember = {
  id: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  active?: boolean | null;
};

function MemberCard({ member, brandColor }: { member: TeamMember; brandColor: string }) {
  const role = member.role?.toLowerCase() ?? "";
  const colors = ROLE_COLORS[role] ?? { bg: "rgba(113,113,122,0.15)", text: "#a1a1aa", border: "rgba(113,113,122,0.2)" };
  const initial = (member.name ?? "?")[0]?.toUpperCase();

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
        border: "1px solid rgba(180,210,240,0.08)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(180,210,240,0.05)",
      }}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white text-base font-bold shrink-0"
          style={{
            background: `linear-gradient(135deg, ${brandColor}30 0%, ${brandColor}15 100%)`,
            border: `1px solid ${brandColor}40`,
          }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate leading-tight">{member.name ?? "—"}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {member.active ? (
              <>
                <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-400 font-medium">Active</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 shrink-0" style={{ color: "#4a6a8a" }} />
                <span className="text-[11px] font-medium" style={{ color: "#4a6a8a" }}>Inactive</span>
              </>
            )}
          </div>
        </div>
        {/* Role badge */}
        <div
          className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {member.role ?? "—"}
        </div>
      </div>

      {/* Email */}
      {member.email && (
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "#3a5a7a" }} />
          <span className="text-xs truncate" style={{ color: "#4a6a8a" }}>{member.email}</span>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{label}</span>
      <span
        className="text-[10px] font-bold rounded-full px-2 py-0.5"
        style={{ background: "rgba(180,210,240,0.08)", color: "#3a5a7a" }}
      >
        {count}
      </span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

export default async function TeamPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) redirect("/login");

  const { data: team } = await supabase
    .from("team_members")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("role", { ascending: true });

  const allMembers: TeamMember[] = team ?? [];

  // Group by role
  const grouped: Record<string, TeamMember[]> = {};
  for (const m of allMembers) {
    const key = m.role?.toLowerCase() ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const orderedKeys = [
    ...ROLE_ORDER.filter((r) => grouped[r]),
    ...Object.keys(grouped).filter((k) => !ROLE_ORDER.includes(k)),
  ];

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-sm mt-0.5" style={{ color: "#4a6a8a" }}>
          {allMembers.length} members &nbsp;·&nbsp; {allMembers.filter((m) => m.active).length} active
        </p>
      </div>

      {!allMembers.length ? (
        <EmptyState
          icon={Users2}
          title="No team data"
          description="Team roster will appear here once synced from your sheet."
        />
      ) : (
        <div className="space-y-6">
          {orderedKeys.map((role) => {
            const members = grouped[role];
            return (
              <div key={role} className="space-y-3">
                <SectionLabel label={`${capitalize(role)}s`} count={members.length} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => (
                    <MemberCard key={m.id} member={m} brandColor={tenant.brand_color} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
