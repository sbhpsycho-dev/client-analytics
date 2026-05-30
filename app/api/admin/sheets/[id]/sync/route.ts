import { NextResponse } from "next/server";
import { isAgencyStaff } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { orchestrateSyncForTenant } from "@/lib/sync/engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const service = createServiceClient();

  const { data: conn } = await service
    .from("sheet_connections")
    .select("tenant_id")
    .eq("id", id)
    .single();

  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await orchestrateSyncForTenant(conn.tenant_id);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
