import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify requester is agency staff or a member of this specific tenant
  const { data: profile } = await supabase.from("user_profiles").select("system_role").eq("id", user.id).single();
  const isStaff = ["agency_admin", "agency_agent"].includes(profile?.system_role ?? "");
  if (!isStaff) {
    const { data: membership } = await supabase
      .from("tenant_memberships").select("role")
      .eq("tenant_id", tenant.id).eq("user_id", user.id).eq("invite_status", "accepted").single();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("*, user_profiles(full_name, avatar_url)")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[tenant/members GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
