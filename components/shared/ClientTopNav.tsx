"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Users2,
  TrendingUp,
  Target,
  BarChart3,
  Settings,
} from "lucide-react";

interface ClientTopNavProps {
  tenantSlug: string;
  brandColor: string;
}

export function ClientTopNav({ tenantSlug, brandColor }: ClientTopNavProps) {
  const pathname = usePathname();
  const base = `/clients/${tenantSlug}`;

  const tabs = [
    { href: base,                  label: "Dashboard",     icon: LayoutDashboard, exact: true },
    { href: `${base}/calls`,       label: "Calls",         icon: Phone },
    { href: `${base}/leads`,       label: "Leads",         icon: Users2 },
    { href: `${base}/team`,        label: "Rep Leaderboard", icon: Users2 },
    { href: `${base}/trackers`,    label: "Trackers",      icon: Target },
    { href: `${base}/reports`,     label: "Reports",       icon: BarChart3 },
    { href: `${base}/settings`,    label: "Settings",      icon: Settings },
  ];

  return (
    <div
      className="flex items-center gap-1 px-4 shrink-0 overflow-x-auto"
      style={{
        borderBottom: "1px solid rgba(180,210,240,0.08)",
        background: "rgba(10,18,32,0.7)",
        height: "46px",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="relative flex items-center gap-1.5 px-3.5 h-full text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            style={{
              color: active ? "#dce8f4" : "#3a5a7a",
            }}
          >
            {/* Active underline */}
            {active && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                style={{ backgroundColor: brandColor }}
              />
            )}
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
