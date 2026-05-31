import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

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

  const { data, error: dbErr } = await service
    .from("tenants")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  await service.from("audit_logs").insert({
    tenant_id: id,
    actor_id: userId,
    action: "tenant.updated",
    entity_type: "tenant",
    entity_id: id,
    after_data: JSON.parse(JSON.stringify(update)),
  });

  return NextResponse.json({ ok: true, tenant: data });
}
