import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/google/encrypt";
import { refreshAccessToken } from "@/lib/google/oauth";
import { getSheetHeaders, getSheetMetadata } from "@/lib/google/sheets";

export async function GET(
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
    .select("*")
    .eq("id", id)
    .single();

  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let accessToken = conn.oauth_access_token ? decrypt(conn.oauth_access_token as string) : "";

  // Refresh token if expired
  if (conn.oauth_token_expiry) {
    const expiry = new Date(conn.oauth_token_expiry).getTime();
    if (Date.now() > expiry - 60_000 && conn.oauth_refresh_token) {
      const refreshed = await refreshAccessToken(decrypt(conn.oauth_refresh_token as string));
      accessToken = refreshed.access_token;
      await service.from("sheet_connections").update({
        oauth_access_token: refreshed.access_token,
        oauth_token_expiry: new Date(refreshed.expiry_date).toISOString(),
      }).eq("id", id);
    }
  }

  const [callsHeaders, leadsHeaders, teamHeaders, metadata] = await Promise.all([
    getSheetHeaders(accessToken, conn.sheet_id, conn.tab_calls).catch(() => []),
    getSheetHeaders(accessToken, conn.sheet_id, conn.tab_leads).catch(() => []),
    getSheetHeaders(accessToken, conn.sheet_id, conn.tab_team).catch(() => []),
    getSheetMetadata(accessToken, conn.sheet_id).catch(() => null),
  ]);

  const tabs = metadata?.sheets.map((s) => s.properties.title) ?? [];

  return NextResponse.json({ calls: callsHeaders, leads: leadsHeaders, team: teamHeaders, tabs });
}
