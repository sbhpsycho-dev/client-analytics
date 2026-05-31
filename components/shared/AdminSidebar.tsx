"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Calendar,
  Users,
  MessageSquare,
  BookOpen,
  TrendingUp,
  BarChart3,
  Megaphone,
  Receipt,
  DollarSign,
  RefreshCw,
  ScrollText,
  UsersRound,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  adminOnly?: boolean;
  staffOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin",              label: "Leaderboard",  icon: Trophy,      exact: true },
  { href: "/admin/calendar",     label: "Calendar",     icon: Calendar },
  { href: "/admin/clients",      label: "Clients",      icon: Users },
  { href: "/admin/messages",     label: "Messages",     icon: MessageSquare },
  { href: "/admin/resources",    label: "Resources",    icon: BookOpen },
  { href: "/admin/my-numbers",   label: "My Numbers",   icon: TrendingUp,   staffOnly: true },
  { href: "/admin/insights",     label: "Insights",     icon: BarChart3 },
  { href: "/admin/ads",          label: "Ad Scorecard", icon: Megaphone,    adminOnly: true },
  { href: "/admin/expenses",     label: "Expenses",     icon: Receipt,      adminOnly: true },
  { href: "/admin/payouts",      label: "Payouts",      icon: DollarSign,   adminOnly: true },
  { href: "/admin/sync-status",  label: "Sync Status",  icon: RefreshCw,    adminOnly: true },
  { href: "/admin/logs",         label: "Logs",         icon: ScrollText,   adminOnly: true },
  { href: "/admin/users",        label: "Users",        icon: UsersRound,   adminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();

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

      {/* Footer */}
      <div className="p-3" style={{ borderTop: `1px solid ${NAVY_BORDER}` }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left"
          style={{ color: "#3a5a7a" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#7a9ab8"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#3a5a7a"; }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
