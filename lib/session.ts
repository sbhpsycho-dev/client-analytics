import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "leadwell_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const s = process.env.SESSION_SECRET?.trim();
  if (s) return new TextEncoder().encode(s);
  // Fallback: derive from MASTER_PASSWORD when SESSION_SECRET not yet configured
  const pw = process.env.MASTER_PASSWORD?.trim();
  const em = process.env.ADMIN_EMAIL?.trim();
  if (!pw || !em) throw new Error("Auth not configured — set SESSION_SECRET or MASTER_PASSWORD+ADMIN_EMAIL");
  return new TextEncoder().encode(`${pw}::${em}::leadwell_auth_v1`);
}

export interface AdminSession {
  email: string;
  role: string;
}

export async function signAdminSession(email: string, role: string): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

// Safe to import from proxy.ts — no next/headers dependency.
export async function verifyAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const email = payload["email"];
    const role = payload["role"];
    if (typeof email !== "string" || typeof role !== "string") return null;
    return { email, role };
  } catch {
    return null;
  }
}
