import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_invite`);
  }

  const service = createServiceClient();

  const { data: membership } = await service
    .from("tenant_memberships")
    .select("id, tenant_id, invite_status, invite_email, tenants(slug)")
    .eq("invite_token", token)
    .single();

  if (!membership || membership.invite_status !== "pending") {
    return NextResponse.redirect(`${appUrl}/login?error=invite_expired`);
  }

  // Check if user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?returnTo=/api/invites/accept?token=${token}`);
  }

  // Verify the logged-in user's email matches the invite
  if (membership.invite_email && user.email?.toLowerCase() !== membership.invite_email.toLowerCase()) {
    return NextResponse.redirect(`${appUrl}/login?error=invite_wrong_account`);
  }

  // Accept invite
  await service
    .from("tenant_memberships")
    .update({
      user_id: user.id,
      invite_status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", membership.id);

  const slug = (membership.tenants as any)?.slug;
  return NextResponse.redirect(`${appUrl}/clients/${slug}`);
}
