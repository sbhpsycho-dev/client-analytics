import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAgencyStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, service: null, error: "Unauthorized" };

  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  const role = profile?.system_role ?? (user.email === process.env.ADMIN_EMAIL ? "agency_admin" : "client");
  if (!["agency_admin", "agency_agent"].includes(role)) {
    return { user: null, service: null, error: "Forbidden" };
  }
  return { user, service, error: null };
}

export async function GET(request: Request) {
  const { service, error } = await requireAgencyStaff();
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
  const { user, service, error } = await requireAgencyStaff();
  if (error || !service || !user) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

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
    actor_id: user.id,
    action: "lead.created",
    entity_type: "lead",
    entity_id: data.id,
    after_data: JSON.parse(JSON.stringify(body)),
  });

  return NextResponse.json({ ok: true, lead: data });
}
