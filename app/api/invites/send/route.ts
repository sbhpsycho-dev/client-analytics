import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantSlug, email, role } = await request.json();
  if (!tenantSlug || !email || !role) {
    return NextResponse.json({ error: "tenantSlug, email, and role are required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Resolve tenant
  const { data: tenant } = await service
    .from("tenants")
    .select("id, name")
    .eq("slug", tenantSlug)
    .single();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Check inviter has permission
  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  const isStaff = profile?.system_role === "agency_admin" || profile?.system_role === "agency_agent";
  const { data: membership } = await service
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  const isOwner = membership?.role === "client_owner";
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = crypto.randomBytes(32).toString("hex");

  await service.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    role,
    invited_by: user.id,
    invite_token: token,
    invite_email: email,
    invite_status: "pending",
  });

  await sendInviteEmail(email, token, tenant.name, role);

  // Audit log
  await service.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_id: user.id,
    action: "user.invited",
    entity_type: "tenant_membership",
    after_data: { email, role },
  });

  return NextResponse.json({ ok: true });
}
