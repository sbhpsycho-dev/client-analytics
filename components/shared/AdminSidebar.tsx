"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GitBranch,
  Trophy,
  BarChart3,
  ChevronRight,
  Users,
  LogOut,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin",             label: "Dashboard",       icon: LayoutDashboard, exact: true },
  { href: "/admin/pipeline",    label: "Pipeline",        icon: GitBranch },
  { href: "/admin/leaderboard", label: "Rep Leaderboard", icon: Trophy },
  { href: "/admin/staff",       label: "Staff",           icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const NAVY_BORDER = "rgba(180,210,240,0.08)";
  const NAVY_ACTIVE_BG = "rgba(42,68,114,0.5)";
  const NAVY_HOVER_BG = "rgba(42,68,114,0.25)";

  return (
    <aside
      className="flex h-full w-60 flex-col"
      style={{
        background: "linear-gradient(180deg, #0f1d35 0%, #0d1828 100%)",
        borderRight: `1px solid ${NAVY_BORDER}`,
      }}
    >
      {/* Brand */}
      <div
        className="flex h-16 items-center gap-3 px-4"
        style={{ borderBottom: `1px solid ${NAVY_BORDER}` }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: "linear-gradient(135deg, #1e3a6e, #2a4f8a)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
        >
          <BarChart3 className="h-4 w-4" style={{ color: "#a8bdd4" }} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide" style={{ color: "#c8daea" }}>LeadWell</p>
          <p className="text-xs tracking-widest uppercase" style={{ color: "#4a6a8a" }}>Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all overflow-hidden",
                active ? "text-white" : "hover:text-white"
              )}
              style={{
                color: active ? "#dce8f4" : "#7a9ab8",
                backgroundColor: active ? NAVY_ACTIVE_BG : "transparent",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = NAVY_HOVER_BG; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              {active && (
                <span
                  className="absolute left-0 inset-y-0 w-[3px] rounded-r my-1.5"
                  style={{ backgroundColor: "#4a7ab5" }}
                />
              )}
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${NAVY_BORDER}` }}>
        {/* Who's logged in */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #1e3a6e, #2a4f8a)", color: "#a8bdd4" }}>
            {session?.user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#c8daea" }}>
              {session?.user?.email ?? "Admin"}
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#3a5a7a" }}>Administrator</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all w-full text-left"
          style={{
            color: "#7a9ab8",
            border: "1px solid rgba(180,210,240,0.08)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#f87171";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.25)";
            (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#7a9ab8";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(180,210,240,0.08)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
