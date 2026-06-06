import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const authOptions: NextAuthOptions = {
  providers: [
    // Admin login — single master password
    CredentialsProvider({
      id: "credentials",
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

    // Admin impersonate — creates a staff session without knowing rep's password
    CredentialsProvider({
      id: "impersonate",
      name: "Impersonate",
      credentials: {
        token:   { label: "Token",   type: "text" },
        staffId: { label: "StaffId", type: "text" },
      },
      async authorize(credentials) {
        const { token, staffId } = credentials ?? {};
        if (!token || !staffId) return null;

        // Verify HMAC token — valid for current and previous 30-second window
        const secret = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? process.env.MASTER_PASSWORD ?? "";
        const now = Math.floor(Date.now() / 30_000);
        const validTokens = [now, now - 1].map(w =>
          createHmac("sha256", secret).update(`${staffId}:${w}`).digest("hex")
        );
        if (!validTokens.includes(token)) return null;

        try {
          const sb = createServiceClient();
          const { data } = await sb
            .from("staff_accounts")
            .select("id, name, email, role, sheet_id, sheet_tab, active")
            .eq("id", staffId)
            .single();

          if (!data || !data.active) return null;

          return {
            id:        data.id,
            name:      data.name,
            email:     data.email,
            role:      data.role,
            isStaff:   true,
            staffRole: data.role as "setter" | "closer",
            sheetId:   data.sheet_id ?? undefined,
            sheetTab:  data.sheet_tab ?? "Sheet1",
          };
        } catch {
          return null;
        }
      },
    }),

    // Staff login — email + password per rep stored in staff_accounts
    CredentialsProvider({
      id: "staff",
      name: "Staff Login",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        try {
          const sb = createServiceClient();
          const { data, error } = await sb
            .from("staff_accounts")
            .select("id, name, email, role, password_hash, sheet_id, sheet_tab, active")
            .eq("email", email)
            .single();

          if (error || !data || !data.active) return null;

          const valid = await bcrypt.compare(password, data.password_hash);
          if (!valid) return null;

          return {
            id:        data.id,
            name:      data.name,
            email:     data.email,
            role:      data.role,
            isStaff:   true,
            staffRole: data.role as "setter" | "closer",
            sheetId:   data.sheet_id ?? undefined,
            sheetTab:  data.sheet_tab ?? "Sheet1",
          };
        } catch {
          return null;
        }
      },
    }),
  ],

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
        token.role      = (user as { role: string }).role;
        token.isStaff   = (user as { isStaff?: boolean }).isStaff;
        token.staffRole = (user as { staffRole?: "setter" | "closer" }).staffRole;
        token.sheetId   = (user as { sheetId?: string }).sheetId;
        token.sheetTab  = (user as { sheetTab?: string }).sheetTab;
        // staff_accounts.id — needed to write daily_numbers rows
        if ((user as { isStaff?: boolean }).isStaff) {
          token.staffId = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role      = token.role as string;
      session.user.isStaff   = token.isStaff;
      session.user.staffRole = token.staffRole;
      session.user.sheetId   = token.sheetId;
      session.user.sheetTab  = token.sheetTab;
      session.user.staffId   = token.staffId;
      return session;
    },
  },
};
