import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { userId, service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { name, slug, brand_color } = await request.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const { data: tenant, error: dbErr } = await service
    .from("tenants")
    .insert({
      name,
      slug: cleanSlug,
      brand_color: brand_color ?? "#6366f1",
      status: "active",
    })
    .select()
    .single();

  if (dbErr) {
    if (dbErr.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken. Choose a different one." }, { status: 409 });
    }
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  await service.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_id: userId,
    action: "tenant.created",
    entity_type: "tenant",
    entity_id: tenant.id,
    after_data: { name, slug: cleanSlug },
  });

  return NextResponse.json({ ok: true, tenant });
}
