"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  Users2,
  TrendingUp,
  Settings,
  Target,
  LogOut,
} from "lucide-react";

interface ClientSidebarProps {
  tenantSlug: string;
  tenantName: string;
  logoUrl?: string | null;
  brandColor: string;
}

const NAVY_BORDER = "rgba(180,210,240,0.08)";

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.08)" }} />
      <span className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "#2a4466" }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.08)" }} />
    </div>
  );
}

export function ClientSidebar({ tenantSlug, tenantName, logoUrl, brandColor }: ClientSidebarProps) {
  const pathname = usePathname();
  const base = `/clients/${tenantSlug}`;

  const analyticsItems = [
    { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: `${base}/calls`, label: "Calls", icon: Phone },
    { href: `${base}/leads`, label: "Leads", icon: Users2 },
  ];

  const teamItems = [
    { href: `${base}/team`, label: "Team", icon: Users2 },
    { href: `${base}/trackers`, label: "Trackers", icon: Target },
  ];

  const adminItems = [
    { href: `${base}/reports`, label: "Reports", icon: TrendingUp },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  function NavItem({ href, label, icon: Icon, exact }: { href: string; label: string; icon: React.ElementType; exact?: boolean }) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 overflow-hidden group",
          active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
        )}
        style={active ? {
          background: `linear-gradient(90deg, ${brandColor}18 0%, ${brandColor}08 100%)`,
        } : undefined}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.06)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "";
          }
        }}
      >
        {active && (
          <span
            className="absolute left-0 inset-y-0 w-[3px] rounded-r my-1.5"
            style={{ backgroundColor: brandColor }}
          />
        )}
        <Icon
          className="h-4 w-4 flex-shrink-0 transition-colors"
          style={{ color: active ? brandColor : undefined }}
        />
        <span>{label}</span>
      </Link>
    );
  }

  const initial = tenantName[0]?.toUpperCase() ?? "?";

  return (
    <aside
      className="flex h-full w-64 flex-col shrink-0"
      style={{
        background: "linear-gradient(180deg, #0d1828 0%, #0a1420 100%)",
        borderRight: `1px solid ${NAVY_BORDER}`,
      }}
    >
      {/* Brand header */}
      <div
        className="flex h-16 items-center gap-3 px-4 border-t-[3px] shrink-0"
        style={{ borderTopColor: brandColor, borderBottom: `1px solid ${NAVY_BORDER}` }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={tenantName} width={32} height={32} className="rounded-md object-cover shrink-0" />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm font-bold shrink-0 relative"
            style={{
              background: `linear-gradient(135deg, ${brandColor}40 0%, ${brandColor}20 100%)`,
              border: `1px solid ${brandColor}50`,
              boxShadow: `0 0 12px ${brandColor}20`,
            }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">{tenantName}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#3a5a7a" }}>Analytics</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <SectionLabel label="Analytics" />
        {analyticsItems.map((item) => <NavItem key={item.href} {...item} />)}

        <SectionLabel label="Team" />
        {teamItems.map((item) => <NavItem key={item.href} {...item} />)}

        <SectionLabel label="Admin" />
        {adminItems.map((item) => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Sign out */}
      <div className="p-3 shrink-0" style={{ borderTop: `1px solid ${NAVY_BORDER}` }}>
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group"
          style={{ color: "#3a5a7a" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.05)";
            (e.currentTarget as HTMLElement).style.color = "#6a8aaa";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "#3a5a7a";
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
