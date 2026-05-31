"use server";

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

  if (!masterPassword || !adminEmail) {
    return { error: "Server not configured" };
  }
  if (password.trim() !== masterPassword.trim()) {
    return { error: "Incorrect password" };
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // In a Server Action, cookieStore.set() is committed to the response
        // before redirect() fires — this is the key difference from Route Handlers.
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
      // Account already exists — password in Supabase is out of sync with env var, update it
      const { data: listData } = await service.auth.admin.listUsers();
      const existing = listData?.users.find(u => u.email === adminEmail);
      if (existing) {
        const { error: updateErr } = await service.auth.admin.updateUserById(existing.id, {
          password: masterPassword,
        });
        if (updateErr) return { error: "Password sync failed: " + updateErr.message };
      }
    } else if (created?.user) {
      await service.from("user_profiles").upsert({
        id: created.user.id,
        full_name: "Admin",
        system_role: "agency_admin",
      });
    }

    const { error: retryErr } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: masterPassword,
    });
    if (retryErr) return { error: "Sign in failed: " + retryErr.message };
  }

  // Always ensure this user has agency_admin in user_profiles
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const service = createServiceClient();
    const { error: upsertErr } = await service.from("user_profiles").upsert(
      { id: user.id, full_name: "Admin", system_role: "agency_admin" },
      { onConflict: "id" } as any
    );
    if (upsertErr) console.error("[loginAction] user_profiles upsert failed:", upsertErr.message);
  }

  // Set a self-contained signed session cookie — verified locally by proxy.ts
  // without any Supabase network call, so navigation never bounces to login.
  const sessionToken = await signAdminSession(adminEmail, "agency_admin");
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
