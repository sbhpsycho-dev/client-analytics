import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { verifyAdminSession, COOKIE_NAME } from "@/lib/session";

// Service-role Supabase client for proxy use — bypasses RLS, no auth session needed.
function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  const publicPaths = ["/login", "/api/auth", "/api/invites/accept", "/_next", "/favicon.ico"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // ── Step 1: Check local JWT session cookie (admin — zero network calls) ──
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
  const adminSession = await verifyAdminSession(sessionToken);

  if (adminSession) {
    const { role } = adminSession;

    // /admin/* — agency staff only
    if (pathname.startsWith("/admin")) {
      if (role !== "agency_admin" && role !== "agency_agent") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next({ request });
    }

    // /clients/[tenant]/* — agency staff can access any tenant
    if (pathname.startsWith("/clients/")) {
      if (role === "agency_admin" || role === "agency_agent") {
        return NextResponse.next({ request });
      }
    }

    // Root → redirect admin to first active client dashboard (or /admin if none)
    if (pathname === "/") {
      if (role === "agency_admin" || role === "agency_agent") {
        try {
          const service = getServiceClient();
          const { data: firstTenant } = await service
            .from("tenants")
            .select("slug")
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(1)
            .single();
          const dest = firstTenant?.slug
            ? `/clients/${firstTenant.slug}`
            : "/admin";
          return NextResponse.redirect(new URL(dest, request.url));
        } catch {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    }

    // Any other authenticated path — pass through
    return NextResponse.next({ request });
  }

  // ── Step 2: Fall back to Supabase Auth (for client users via invite links) ──
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Fetch system role for client users
  let profile: { system_role: string } | null = null;
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("system_role")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch { /* graceful */ }

  let role = profile?.system_role ?? "client";
  if (role === "client" && user.email === process.env.ADMIN_EMAIL) {
    role = "agency_admin";
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "agency_admin" && role !== "agency_agent") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (pathname.startsWith("/clients/")) {
    const slug = pathname.split("/")[2];
    if (!slug) return response;
    if (role === "agency_admin" || role === "agency_agent") return response;

    const { data: tenant } = await supabase
      .from("tenants").select("id").eq("slug", slug).single();
    if (!tenant) return NextResponse.redirect(new URL("/", request.url));

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .eq("invite_status", "accepted")
      .single();
    if (!membership) return NextResponse.redirect(new URL("/", request.url));

    response.headers.set("x-tenant-role", membership.role);
    return response;
  }

  if (pathname === "/") {
    if (role === "agency_admin" || role === "agency_agent") {
      try {
        const service = getServiceClient();
        const { data: firstTenant } = await service
          .from("tenants")
          .select("slug")
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        const dest = firstTenant?.slug ? `/clients/${firstTenant.slug}` : "/admin";
        return NextResponse.redirect(new URL(dest, request.url));
      } catch {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, tenants(slug)")
      .eq("user_id", user.id)
      .eq("invite_status", "accepted")
      .limit(1);
    const firstSlug = (memberships?.[0] as any)?.tenants?.slug;
    if (firstSlug) return NextResponse.redirect(new URL(`/clients/${firstSlug}`, request.url));
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
