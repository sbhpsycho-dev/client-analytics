import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface AuthResult {
  userId: string | null;
  email: string | null;
  service: ReturnType<typeof createServiceClient>;
  error: string | null;
}

function getSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.SESSION_SECRET ??
    (process.env.MASTER_PASSWORD && process.env.ADMIN_EMAIL
      ? `${process.env.MASTER_PASSWORD}::${process.env.ADMIN_EMAIL}::leadwell_auth_v1`
      : "")
  );
}

export async function requireAdminAuth(): Promise<AuthResult> {
  const service = createServiceClient();

  // Decode NextAuth JWT directly from cookie — avoids getServerSession compatibility
  // issues with Next.js 16 App Router API routes.
  const cookieStore = await cookies();
  const tokenCookie =
    cookieStore.get("next-auth.session-token") ??
    cookieStore.get("__Secure-next-auth.session-token");

  if (tokenCookie) {
    try {
      const decoded = await decode({ token: tokenCookie.value, secret: getSecret() });
      if (decoded) {
        return {
          userId: (decoded.email as string) ?? "admin",
          email: (decoded.email as string) ?? null,
          service,
          error: null,
        };
      }
    } catch {
      // Invalid token — fall through to Supabase
    }
  }

  // Supabase Auth fallback (legacy client users with Supabase sessions)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, service, error: "Unauthorized" };

  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  const role =
    profile?.system_role ??
    (user.email === process.env.ADMIN_EMAIL ? "agency_admin" : "client");
  if (!["agency_admin", "agency_agent"].includes(role)) {
    return { userId: null, email: null, service, error: "Forbidden" };
  }

  return { userId: user.id, email: user.email ?? null, service, error: null };
}
