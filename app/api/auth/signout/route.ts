import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/session";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
