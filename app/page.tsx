import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasSession =
    !!cookieStore.get("next-auth.session-token") ||
    !!cookieStore.get("__Secure-next-auth.session-token");
  if (!hasSession) redirect("/login");
  redirect("/admin");
}
