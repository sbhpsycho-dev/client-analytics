import { NextResponse } from "next/server";
import { isAgencyStaff } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getSheetIdFromUrl } from "@/lib/google/sheets";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const service = createServiceClient();

  // If sheet_url provided, parse the ID
  if (body.sheet_url) {
    const sheetId = getSheetIdFromUrl(body.sheet_url);
    if (!sheetId) return NextResponse.json({ error: "Invalid sheet URL" }, { status: 400 });
    body.sheet_id = sheetId;
  }

  const { data, error } = await service
    .from("sheet_connections")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const service = createServiceClient();
  await service.from("sheet_connections").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
