import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  const role = profile?.system_role ?? (user.email === process.env.ADMIN_EMAIL ? "agency_admin" : "client");
  if (role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, brand_color, welcome_message, monthly_goal, status } = body;

  const update: {
    name?: string;
    brand_color?: string;
    welcome_message?: string | null;
    monthly_goal?: number;
    status?: "active" | "suspended" | "inactive";
  } = {};
  if (name !== undefined) update.name = name;
  if (brand_color !== undefined) update.brand_color = brand_color;
  if (welcome_message !== undefined) update.welcome_message = welcome_message || null;
  if (monthly_goal !== undefined) update.monthly_goal = Number(monthly_goal);
  if (status !== undefined) update.status = status;

  const { data, error } = await service
    .from("tenants")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from("audit_logs").insert({
    tenant_id: id,
    actor_id: user.id,
    action: "tenant.updated",
    entity_type: "tenant",
    entity_id: id,
    after_data: JSON.parse(JSON.stringify(update)),
  });

  return NextResponse.json({ ok: true, tenant: data });
}
