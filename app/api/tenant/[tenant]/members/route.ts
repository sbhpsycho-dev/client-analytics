import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("*, user_profiles(full_name, avatar_url)")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
