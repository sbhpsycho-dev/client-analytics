"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, BarChart2 } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated" && !session?.user?.isStaff) router.replace("/admin");
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  if (!session?.user?.isStaff) return null;

  const role = session.user.staffRole;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 h-14 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#111111" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
            style={{ background: "#f97316" }}>
            <BarChart2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wide" style={{ color: "#fff" }}>LeadWell</span>
          <span className="h-3.5 w-px mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="text-sm font-semibold" style={{ color: "#fff" }}>{session.user.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.3)",
              color: "#f97316",
            }}>
            {role}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
          style={{ color: "#888", border: "1px solid rgba(255,255,255,0.08)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#888"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
