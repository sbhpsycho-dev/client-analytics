import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { data, error: dbErr } = await service
    .from("leads")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false })
    .limit(50);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(request: Request) {
  const { userId, service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const body = await request.json();
  const { tenant_id, date, lead_name, source, setter, status, notes } = body;

  if (!tenant_id || !date) {
    return NextResponse.json({ error: "tenant_id and date are required" }, { status: 400 });
  }

  const { data, error: dbErr } = await service
    .from("leads")
    .insert({
      tenant_id,
      date,
      lead_name: lead_name || null,
      source: source || null,
      setter: setter || null,
      status: status || "new",
      notes: notes || null,
      excluded: false,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  await service.from("audit_logs").insert({
    tenant_id,
    actor_id: userId,
    action: "lead.created",
    entity_type: "lead",
    entity_id: data.id,
    after_data: JSON.parse(JSON.stringify(body)),
  });

  return NextResponse.json({ ok: true, lead: data });
}
