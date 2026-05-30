import { NextResponse } from "next/server";
import { isAgencyStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: tenantId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sheet_connections")
    .select("id, sheet_id, sheet_url, sheet_name, column_mapping, last_sync_status, last_synced_at, last_sync_error, tab_calls, tab_leads, tab_team")
    .eq("tenant_id", tenantId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
