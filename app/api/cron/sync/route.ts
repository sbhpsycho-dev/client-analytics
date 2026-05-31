import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { orchestrateSyncForTenant } from "@/lib/sync/engine";

const MAX_RUNTIME_MS = 55_000; // stay under Vercel's 60s serverless limit

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: tenants } = (await service
    .from("tenants")
    .select("id, sheet_connections(sync_enabled)")
    .eq("status", "active")) as any;

  const activeTenantIds = ((tenants ?? []) as any[])
    .filter((t: any) => t.sheet_connections?.[0]?.sync_enabled)
    .map((t: any) => t.id as string);

  const results: Record<string, { ok: boolean; rowsImported: number; error?: string }> = {};
  const started = Date.now();

  for (const tenantId of activeTenantIds) {
    if (Date.now() - started > MAX_RUNTIME_MS) {
      results[tenantId] = { ok: false, rowsImported: 0, error: "Runtime limit reached — deferred to next run" };
      continue;
    }
    results[tenantId] = await orchestrateSyncForTenant(tenantId);
    // Brief pause to avoid Google Sheets API rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({ synced: Object.keys(results).length, results });
}

export async function POST(request: Request) {
  return GET(request);
}
