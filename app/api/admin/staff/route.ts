import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getSheetIdFromUrl } from "@/lib/google/sheets";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("staff_accounts")
    .select("id, name, email, role, sheet_id, sheet_tab, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, role, password, sheetUrl, sheetTab } = body;

  if (!name || !email || !role || !password) {
    return NextResponse.json({ error: "name, email, role, and password are required" }, { status: 400 });
  }
  if (!["setter", "closer"].includes(role)) {
    return NextResponse.json({ error: "role must be setter or closer" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const sheet_id = sheetUrl ? (getSheetIdFromUrl(sheetUrl) ?? sheetUrl) : null;

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("staff_accounts")
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      password_hash,
      sheet_id,
      sheet_tab: sheetTab?.trim() || "Sheet1",
    })
    .select("id, name, email, role, sheet_id, sheet_tab, active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A staff member with that email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
