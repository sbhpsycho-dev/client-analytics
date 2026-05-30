import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (!["agency_admin", "agency_agent"].includes(profile?.system_role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, slug, brand_color } = await request.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const { data: tenant, error } = await service
    .from("tenants")
    .insert({
      name,
      slug: cleanSlug,
      brand_color: brand_color ?? "#6366f1",
      status: "active",
      assigned_agent_id: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken. Choose a different one." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await service.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_id: user.id,
    action: "tenant.created",
    entity_type: "tenant",
    entity_id: tenant.id,
    after_data: { name, slug: cleanSlug },
  });

  return NextResponse.json({ ok: true, tenant });
}
