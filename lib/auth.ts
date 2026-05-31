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
  // Fall back to SESSION_SECRET so existing deployments work without new env var
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
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
