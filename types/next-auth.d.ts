import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      isStaff?: boolean;
      staffRole?: "setter" | "closer";
      sheetId?: string;
      sheetTab?: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: string;
    isStaff?: boolean;
    staffRole?: "setter" | "closer";
    sheetId?: string;
    sheetTab?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    isStaff?: boolean;
    staffRole?: "setter" | "closer";
    sheetId?: string;
    sheetTab?: string;
  }
}
