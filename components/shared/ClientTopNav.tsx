"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Users2,
  Target,
  BarChart3,
  Settings,
  MoreHorizontal,
} from "lucide-react";

interface ClientTopNavProps {
  tenantSlug: string;
  brandColor: string;
}

export function ClientTopNav({ tenantSlug, brandColor }: ClientTopNavProps) {
  const pathname = usePathname();
  const base = `/clients/${tenantSlug}`;

  const tabs = [
    { href: base,                  label: "Dashboard",       icon: LayoutDashboard, exact: true },
    { href: `${base}/calls`,       label: "Calls",           icon: Phone },
    { href: `${base}/leads`,       label: "Leads",           icon: Users2 },
    { href: `${base}/team`,        label: "Team",            icon: Users2 },
    { href: `${base}/trackers`,    label: "Trackers",        icon: Target },
    { href: `${base}/reports`,     label: "Reports",         icon: BarChart3 },
    { href: `${base}/settings`,    label: "Settings",        icon: Settings },
  ];

  return (
    <div
      className="flex items-center gap-0.5 px-3 shrink-0 overflow-x-auto"
      style={{
        borderBottom: "1px solid rgba(180,210,240,0.08)",
        background: "rgba(10,18,32,0.7)",
        height: "46px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="relative flex items-center gap-1.5 px-3 h-full text-sm font-medium whitespace-nowrap shrink-0 rounded-sm select-none"
            style={{
              color: active ? "#dce8f4" : "#3a5a7a",
              transition: "color 120ms, background 120ms, transform 80ms",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "#7a9ab8";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "#3a5a7a";
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
            }}
            onTouchStart={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "#7a9ab8";
              (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              if (!active) (e.currentTarget as HTMLElement).style.color = "#3a5a7a";
            }}
          >
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

// ── Mobile bottom tab bar ─────────────────────────────────────────────────────
// Shown only on mobile (below lg). Fixed to the bottom of the viewport.

const BOTTOM_TABS = [
  { key: "dashboard", label: "Overview",  icon: LayoutDashboard, exact: true },
  { key: "calls",     label: "Calls",     icon: Phone },
  { key: "leads",     label: "Leads",     icon: Users2 },
  { key: "team",      label: "Team",      icon: Users2 },
  { key: "more",      label: "More",      icon: MoreHorizontal },
];

export function MobileBottomBar({ tenantSlug, brandColor }: { tenantSlug: string; brandColor: string }) {
  const pathname = usePathname();
  const base = `/clients/${tenantSlug}`;

  const hrefFor = (key: string) => key === "dashboard" ? base : `${base}/${key}`;
  const isActive = (key: string, exact?: boolean) => {
    const href = hrefFor(key);
    return exact ? pathname === href : pathname.startsWith(href);
  };

  // "More" is active when on trackers, reports, or settings
  const moreActive = ["/trackers", "/reports", "/settings"].some((s) => pathname.startsWith(`${base}${s}`));

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch"
      style={{
        background: "linear-gradient(0deg, #080f1e 70%, rgba(8,15,30,0.92) 100%)",
        borderTop: "1px solid rgba(180,210,240,0.10)",
        height: "60px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {BOTTOM_TABS.map(({ key, label, icon: Icon, exact }) => {
        const active = key === "more" ? moreActive : isActive(key, exact);
        const href = key === "more" ? `${base}/trackers` : hrefFor(key);

        return (
          <Link
            key={key}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 select-none"
            style={{
              color: active ? "#dce8f4" : "#2a4466",
              WebkitTapHighlightColor: "transparent",
              transition: "color 120ms, transform 80ms",
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.88)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: active ? brandColor : undefined }}
            />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
