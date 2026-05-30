import { redirect } from "next/navigation";
import { isAgencyStaff } from "@/lib/auth";
import { AdminSidebar } from "@/components/shared/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await isAgencyStaff();
  if (!staff) redirect("/login");

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
