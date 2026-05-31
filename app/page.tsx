import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Proxy handles role-based routing, but if a request reaches this page
// (e.g. returnTo="/"), never send an authenticated user back to login.
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  redirect("/admin");
}
