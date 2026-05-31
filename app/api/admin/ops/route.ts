import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const OPS_URL = process.env.APPS_SCRIPT_OPS_URL;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();
  if (!["agency_admin", "agency_agent"].includes(profile?.system_role ?? "")) return null;
  return user;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!OPS_URL) return NextResponse.json({ error: "APPS_SCRIPT_OPS_URL not configured" }, { status: 503 });
  try {
    const res = await fetch(OPS_URL, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upstream error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!OPS_URL) return NextResponse.json({ error: "APPS_SCRIPT_OPS_URL not configured" }, { status: 503 });
  try {
    const body = await req.json();
    const res = await fetch(OPS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.ok ? 200 : res.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upstream error" }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!OPS_URL) return NextResponse.json({ error: "APPS_SCRIPT_OPS_URL not configured" }, { status: 503 });
  try {
    const body = await req.json();
    const res = await fetch(OPS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "patch", ...body }),
    });
    return NextResponse.json(await res.json(), { status: res.ok ? 200 : res.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upstream error" }, { status: 502 });
  }
}
