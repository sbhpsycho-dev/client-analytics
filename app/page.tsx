// Root page — middleware handles redirect to /admin or /clients/[slug]
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
