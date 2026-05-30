import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google/oauth";
import { encrypt } from "@/lib/google/encrypt";
import { getSheetMetadata } from "@/lib/google/sheets";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/admin?error=google_oauth_failed`);
  }

  let tenantId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    tenantId = parsed.tenantId;
  } catch {
    return NextResponse.redirect(`${appUrl}/admin?error=invalid_state`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const tokens = await exchangeCode(code);

  // Get spreadsheet list to show agent (stored later via sheet setup form)
  const service = createServiceClient();
  await service
    .from("sheet_connections")
    .upsert(
      {
        tenant_id: tenantId,
        agent_user_id: user.id,
        sheet_id: "PENDING",
        oauth_access_token: encrypt(tokens.access_token),
        oauth_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        oauth_token_expiry: new Date(tokens.expiry_date).toISOString(),
        last_sync_status: "pending",
      },
      { onConflict: "tenant_id" }
    );

  return NextResponse.redirect(`${appUrl}/admin/clients/${tenantId}/sheet?connected=true`);
}
