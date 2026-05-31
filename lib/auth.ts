import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const pw = credentials?.password?.trim();
        if (!pw) return null;

        const masterPw = process.env.MASTER_PASSWORD?.trim();
        const adminEmail = process.env.ADMIN_EMAIL?.trim();
        if (!masterPw || !adminEmail) return null;

        if (pw !== masterPw) return null;

        return { id: "admin", name: "Admin", email: adminEmail, role: "admin" };
      },
    }),
  ],
  // Fallback chain mirrors the old lib/session.ts logic so Vercel deploys with only
  // MASTER_PASSWORD + ADMIN_EMAIL continue to work without new env vars.
  secret:
    process.env.NEXTAUTH_SECRET ??
    process.env.SESSION_SECRET ??
    (process.env.MASTER_PASSWORD && process.env.ADMIN_EMAIL
      ? `${process.env.MASTER_PASSWORD}::${process.env.ADMIN_EMAIL}::leadwell_auth_v1`
      : undefined),
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      return session;
    },
  },
};
