// Server Components / Server Actions ONLY — do NOT import this from proxy.ts.
// Uses next/headers which is unavailable in the proxy/middleware context.
import { cookies } from "next/headers";
import { verifyAdminSession, COOKIE_NAME } from "@/lib/session";
import type { AdminSession } from "@/lib/session";

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

export type { AdminSession };
