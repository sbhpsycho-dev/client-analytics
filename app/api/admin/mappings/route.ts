import { NextResponse } from "next/server";
import { isAgencyStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUser } from "@/lib/auth";

export async function GET() {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("mapping_templates")
    .select("id, name, description, mapping, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await getUser();
  const { name, description, mapping } = await request.json();
  if (!name || !mapping) return NextResponse.json({ error: "name and mapping required" }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("mapping_templates")
    .insert({ name, description, mapping, created_by: user?.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
