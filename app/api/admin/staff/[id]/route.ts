import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getSheetIdFromUrl } from "@/lib/google/sheets";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = createServiceClient();
  const { error } = await sb.from("staff_accounts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  type StaffUpdate = {
    password_hash?: string;
    sheet_id?: string | null;
    sheet_tab?: string | null;
    active?: boolean;
  };
  const updates: StaffUpdate = {};

  if (body.password) {
    updates.password_hash = await bcrypt.hash(body.password, 12);
  }
  if (body.sheetUrl !== undefined) {
    updates.sheet_id = body.sheetUrl ? (getSheetIdFromUrl(body.sheetUrl) ?? body.sheetUrl) : null;
  }
  if (body.sheetTab !== undefined) {
    updates.sheet_tab = body.sheetTab || "Sheet1";
  }
  if (body.active !== undefined) {
    updates.active = body.active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("staff_accounts")
    .update(updates)
    .eq("id", id)
    .select("id, name, email, role, sheet_id, sheet_tab, active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
