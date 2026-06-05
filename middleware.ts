import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const secret =
    process.env.NEXTAUTH_SECRET ??
    process.env.SESSION_SECRET ??
    (process.env.MASTER_PASSWORD && process.env.ADMIN_EMAIL
      ? `${process.env.MASTER_PASSWORD}::${process.env.ADMIN_EMAIL}::leadwell_auth_v1`
      : undefined);

  const token = await getToken({ req: request, secret });

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    // Staff trying to access admin → send to staff dashboard
    if (token.isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = "/staff";
      return NextResponse.redirect(url);
    }
  }

  // Protect /staff routes
  if (pathname.startsWith("/staff")) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    // Admin trying to access staff → send to admin dashboard
    if (!token.isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
