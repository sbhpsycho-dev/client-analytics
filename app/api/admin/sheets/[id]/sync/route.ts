import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { orchestrateSyncForTenant } from "@/lib/sync/engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
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
  if (result.ok) revalidatePath("/clients/[tenant]", "page");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
