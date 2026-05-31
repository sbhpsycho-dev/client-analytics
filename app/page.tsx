import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/server-session";

// Safety net: proxy handles routing, but if a request reaches this page,
// check the custom session cookie before touching Supabase.
export default async function RootPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  redirect("/admin");
}
