import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { data, error: dbErr } = await service
    .from("calls")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false })
    .limit(50);

  if (dbErr) {
    console.error("[calls GET]", dbErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ calls: data });
}

export async function POST(request: Request) {
  const { userId, service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const body = await request.json();
  const { tenant_id, date, setter, closer, lead_name, status, outcome, cash_collected, contract_value } = body;

  if (!tenant_id || !date) {
    return NextResponse.json({ error: "tenant_id and date are required" }, { status: 400 });
  }

  const { data, error: dbErr } = await service
    .from("calls")
    .insert({
      tenant_id,
      date,
      setter: setter || null,
      closer: closer || null,
      lead_name: lead_name || null,
      status: status || "booked",
      outcome: outcome || null,
      cash_collected: cash_collected ? Number(cash_collected) : null,
      contract_value: contract_value ? Number(contract_value) : null,
      excluded: false,
    })
    .select()
    .single();

  if (dbErr) {
    console.error("[calls POST]", dbErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  await service.from("audit_logs").insert({
    tenant_id,
    actor_id: userId,
    action: "call.created",
    entity_type: "call",
    entity_id: data.id,
    after_data: JSON.parse(JSON.stringify(body)),
  });

  revalidatePath("/clients/[tenant]", "page");
  return NextResponse.json({ ok: true, call: data });
}
