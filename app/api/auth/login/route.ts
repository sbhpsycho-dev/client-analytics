import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/service";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export async function POST(request: Request) {
  const { password } = await request.json();

  const masterPassword = process.env.MASTER_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!masterPassword || !adminEmail) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (password.trim() !== masterPassword.trim()) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const service = createServiceClient();

  const cookieStore = await cookies();

  // Capture every cookie Supabase wants to set so we can write them
  // explicitly onto the NextResponse (cookies().set() alone does not
  // propagate into a separately-constructed NextResponse object).
  const captured: Array<{ name: string; value: string; options: Partial<ResponseCookie> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          captured.push(...cookiesToSet);
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Try to sign in with the current MASTER_PASSWORD
  let { error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: masterPassword,
  });

  if (signInError) {
    // Attempt to create the account (first-time setup)
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: adminEmail,
      password: masterPassword,
      email_confirm: true,
    });

    if (createError) {
      // Account already exists — password in Supabase is out of sync with env var.
      // Update the user's password to match MASTER_PASSWORD, then sign in.
      const { data: listData, error: listError } = await service.auth.admin.listUsers();
      if (listError) {
        return NextResponse.json({ error: "Auth sync failed: " + listError.message }, { status: 500 });
      }
      const existingUser = listData.users.find((u) => u.email === adminEmail);
      if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 500 });
      }
      const { error: updateError } = await service.auth.admin.updateUserById(existingUser.id, {
        password: masterPassword,
      });
      if (updateError) {
        return NextResponse.json({ error: "Password sync failed: " + updateError.message }, { status: 500 });
      }
    } else {
      // New account created — set agency_admin role
      if (created.user) {
        await service.from("user_profiles").upsert({
          id: created.user.id,
          full_name: "Admin",
          system_role: "agency_admin",
        }).then(() => {});
      }
    }

    // Sign in with the (now correct) password
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: masterPassword,
    });

    if (retryError) {
      return NextResponse.json({ error: "Sign in failed: " + retryError.message }, { status: 500 });
    }
  }

  // Always ensure the admin user has agency_admin role in user_profiles.
  const { data: { user: signedInUser } } = await supabase.auth.getUser();
  if (signedInUser) {
    await service.from("user_profiles").upsert({
      id: signedInUser.id,
      full_name: "Admin",
      system_role: "agency_admin",
    }, { onConflict: "id" } as any);
  }

  // Build the response and explicitly apply all session cookies so the
  // browser actually stores them (NextResponse.json creates a new object
  // that otherwise has no Set-Cookie headers).
  const response = NextResponse.json({ ok: true });
  captured.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as ResponseCookie);
  });

  return response;
}
