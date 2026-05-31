import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "leadwell_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const raw = process.env.SHEET_TOKEN_SECRET;
  if (!raw) throw new Error("SHEET_TOKEN_SECRET is not set");
  return new TextEncoder().encode(raw);
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

// Server-component helper — reads cookie from the request automatically
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
