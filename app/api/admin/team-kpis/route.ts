import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAgencyStaff } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { tenant_id, member_name, role, metric_name, value, value_label, period_label } = body;

  if (!tenant_id || !member_name || !role || !metric_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await (service as any)
    .from("team_kpis")
    .insert({ tenant_id, member_name, role, metric_name, value: value ?? null, value_label: value_label ?? null, period_label: period_label ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await (service as any).from("team_kpis").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
