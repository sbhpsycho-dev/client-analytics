import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  const { userId, service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { tenantSlug, email, role } = await request.json();
  if (!tenantSlug || !email || !role) {
    return NextResponse.json({ error: "tenantSlug, email, and role are required" }, { status: 400 });
  }

  const { data: tenant } = await service
    .from("tenants")
    .select("id, name")
    .eq("slug", tenantSlug)
    .single();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const token = crypto.randomBytes(32).toString("hex");

  await service.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    role,
    invited_by: userId,
    invite_token: token,
    invite_email: email,
    invite_status: "pending",
  });

  await sendInviteEmail(email, token, tenant.name, role);

  await service.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_id: userId,
    action: "user.invited",
    entity_type: "tenant_membership",
    after_data: { email, role },
  });

  return NextResponse.json({ ok: true });
}
