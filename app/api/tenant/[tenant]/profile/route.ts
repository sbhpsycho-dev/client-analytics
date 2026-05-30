import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  return NextResponse.json(tenant);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only client_owner or agency staff can update
  const { data: profile } = await supabase.from("user_profiles").select("system_role").eq("id", user.id).single();
  const isStaff = ["agency_admin", "agency_agent"].includes(profile?.system_role ?? "");
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  if (!isStaff && membership?.role !== "client_owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["name", "welcome_message", "brand_color", "default_theme", "logo_url"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("tenants")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", tenant.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
