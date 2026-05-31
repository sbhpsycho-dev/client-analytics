import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface AuthResult {
  userId: string | null;
  email: string | null;
  service: ReturnType<typeof createServiceClient>;
  error: string | null;
}

/**
 * Shared auth check for all /api/admin/** routes.
 * Checks NextAuth session first (agency admin/staff), then falls back to
 * Supabase Auth for backward-compat during the migration window.
 */
export async function requireAdminAuth(): Promise<AuthResult> {
  const service = createServiceClient();

  // NextAuth session (primary: agency admin / staff login)
  const session = await getServerSession(authOptions);
  if (session) {
    return { userId: session.user.email ?? "admin", email: session.user.email ?? null, service, error: null };
  }

  // Supabase Auth fallback (legacy — remove once all clients migrate)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, service, error: "Unauthorized" };

  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  const role = profile?.system_role ?? (user.email === process.env.ADMIN_EMAIL ? "agency_admin" : "client");
  if (!["agency_admin", "agency_agent"].includes(role)) {
    return { userId: null, email: null, service, error: "Forbidden" };
  }

  return { userId: user.id, email: user.email ?? null, service, error: null };
}
