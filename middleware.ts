import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Always allow public and client-user paths through
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/invites") ||
          pathname.startsWith("/_next") ||
          pathname === "/favicon.ico" ||
          // Client users auth via Supabase — let the layout handle it
          pathname.startsWith("/clients/")
        ) return true;

        // Everything else (/, /admin/**) requires a NextAuth session
        return !!token;
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
