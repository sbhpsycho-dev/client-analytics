"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, BarChart3 } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !session?.user?.isStaff) {
      router.replace("/admin");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#4a7ab5" }} />
      </div>
    );
  }

  if (!session?.user?.isStaff) return null;

  const role = session.user.staffRole;
  const roleColor = role === "setter" ? "#1D9E75" : "#3B6FB5";
  const NAVY_BORDER = "rgba(180,210,240,0.08)";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0a1525 0%, #080f1e 100%)" }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 h-14 shrink-0"
        style={{ borderBottom: `1px solid ${NAVY_BORDER}`, background: "rgba(13,24,40,0.8)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #1e3a6e, #2a4f8a)" }}>
            <BarChart3 className="h-3.5 w-3.5" style={{ color: "#a8bdd4" }} />
          </div>
          <span className="text-sm font-bold tracking-wide" style={{ color: "#c8daea" }}>LeadWell</span>
          <span className="h-3.5 w-px" style={{ background: NAVY_BORDER }} />
          <span className="text-sm font-semibold" style={{ color: "#dce8f4" }}>{session.user.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: `${roleColor}20`,
              border: `1px solid ${roleColor}40`,
              color: roleColor,
            }}>
            {role}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#3a5a7a", border: "1px solid rgba(180,210,240,0.08)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#7a9ab8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#3a5a7a"; }}
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
