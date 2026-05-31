"use server";

import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { signAdminSession, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/session";

export async function loginAction(
  password: string,
  returnTo: string = "/"
): Promise<{ error: string } | void> {
  const masterPassword = process.env.MASTER_PASSWORD;
  const adminEmail     = process.env.ADMIN_EMAIL;

  if (!masterPassword?.trim() || !adminEmail?.trim()) {
    return { error: "Server not configured" };
  }
  const pwBuf = Buffer.from(password.trim());
  const mpBuf = Buffer.from(masterPassword.trim());
  if (pwBuf.length !== mpBuf.length || !crypto.timingSafeEqual(pwBuf, mpBuf)) {
    return { error: "Incorrect password" };
  }

  const cookieStore = await cookies();

  // Set the custom session cookie immediately — password is correct, admin is in.
  // This must happen BEFORE any Supabase work so a broken Supabase can never
  // block the admin from logging in.
  let sessionToken: string;
  try {
    sessionToken = await signAdminSession(adminEmail, "agency_admin");
  } catch {
    return { error: "Server not configured" };
  }
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  // Best-effort: also sign into Supabase Auth so API routes that still use
  // supabase.auth.getUser() continue to work. Failures here are non-fatal.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    let { error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: masterPassword,
    });

    if (signInError) {
      const service = createServiceClient();
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email: adminEmail,
        password: masterPassword,
        email_confirm: true,
      });

      if (createErr) {
        const { data: listData } = await service.auth.admin.listUsers();
        const existing = listData?.users.find(u => u.email === adminEmail);
        if (existing) {
          await service.auth.admin.updateUserById(existing.id, { password: masterPassword });
        }
      } else if (created?.user) {
        await service.from("user_profiles").upsert({
          id: created.user.id,
          full_name: "Admin",
          system_role: "agency_admin",
        });
      }

      await supabase.auth.signInWithPassword({ email: adminEmail, password: masterPassword });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const service = createServiceClient();
      await service.from("user_profiles").upsert(
        { id: user.id, full_name: "Admin", system_role: "agency_admin" },
        { onConflict: "id" } as any
      );
    }
  } catch (err) {
    console.error("[loginAction] Supabase best-effort failed:", err);
  }
}
