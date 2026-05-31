import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  // Create a mutable response so refreshed tokens can be written back
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
          // Write refreshed tokens to request (for downstream server components)
          // AND to response (for the browser's next request)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() — validates token with Supabase Auth server and auto-refreshes
  // expired access tokens, writing new ones back via setAll above.
  const { data: { user } } = await supabase.auth.getUser();

  // Public paths — no auth needed
  const publicPaths = ["/login", "/api/auth", "/api/invites/accept", "/_next", "/favicon.ico"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Fetch system role
  let profile: { system_role: string } | null = null;
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("system_role")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch { /* graceful — table may not exist yet */ }

  let role = profile?.system_role ?? "client";

  // Email-based fallback: if DB lookup returned no admin role, grant it by email
  if (role === "client" && user.email === process.env.ADMIN_EMAIL) {
    role = "agency_admin";
  }

  // /admin/* — agency staff only
  if (pathname.startsWith("/admin")) {
    if (role !== "agency_admin" && role !== "agency_agent") {
      // Authenticated but wrong role — send home, not to login
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // /clients/[tenant]/* — agency staff can access any; client users need membership
  if (pathname.startsWith("/clients/")) {
    const slug = pathname.split("/")[2];
    if (!slug) return response;

    if (role === "agency_admin" || role === "agency_agent") {
      return response;
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!tenant) {
      // Authenticated but no matching tenant — send home
      return NextResponse.redirect(new URL("/", request.url));
    }

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .eq("invite_status", "accepted")
      .single();

    if (!membership) {
      // Authenticated but no membership for this tenant — send home
      return NextResponse.redirect(new URL("/", request.url));
    }

    response.headers.set("x-tenant-role", membership.role);
    return response;
  }

  // Root → route by role
  if (pathname === "/") {
    if (role === "agency_admin" || role === "agency_agent") {
      // Find the first active tenant instead of hardcoding a slug
      const { data: firstTenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      const dest = firstTenant?.slug ? `/clients/${firstTenant.slug}` : "/admin";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, tenants(slug)")
      .eq("user_id", user.id)
      .eq("invite_status", "accepted")
      .limit(1);

    const firstSlug = (memberships?.[0] as any)?.tenants?.slug;
    if (firstSlug) {
      return NextResponse.redirect(new URL(`/clients/${firstSlug}`, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
