"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Phone, Users2, TrendingUp,
  Settings, Target, BarChart3, LogOut, Menu, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileNavProps {
  tenantSlug: string;
  tenantName: string;
  brandColor: string;
}

export function MobileNav({ tenantSlug, tenantName, brandColor }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = `/clients/${tenantSlug}`;

  const sections = [
    {
      label: "Analytics",
      items: [
        { href: base,               label: "Dashboard",       icon: LayoutDashboard, exact: true },
        { href: `${base}/calls`,    label: "Calls",           icon: Phone },
        { href: `${base}/leads`,    label: "Leads",           icon: Users2 },
      ],
    },
    {
      label: "Team",
      items: [
        { href: `${base}/team`,     label: "Team",            icon: Users2 },
        { href: `${base}/trackers`, label: "Trackers",        icon: Target },
      ],
    },
    {
      label: "Admin",
      items: [
        { href: `${base}/reports`,  label: "Reports",         icon: BarChart3 },
        { href: `${base}/settings`, label: "Settings",        icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="lg:hidden flex items-center justify-between px-4 h-14 shrink-0"
        style={{
          background: "linear-gradient(180deg, #0d1828 0%, #0a1420 100%)",
          borderBottom: "1px solid rgba(180,210,240,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: `${brandColor}30`, border: `1px solid ${brandColor}50` }}
          >
            {tenantName[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-white">{tenantName}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "#7a9ab8" }}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden"
              style={{
                background: "linear-gradient(180deg, #0d1828 0%, #0a1420 100%)",
                borderRight: "1px solid rgba(180,210,240,0.08)",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-5 h-14 border-t-[3px] shrink-0"
                style={{ borderTopColor: brandColor, borderBottom: "1px solid rgba(180,210,240,0.08)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: `${brandColor}30`, border: `1px solid ${brandColor}50` }}
                  >
                    {tenantName[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white">{tenantName}</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ color: "#4a6a8a" }}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav sections */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {sections.map(({ label, items }) => (
                  <div key={label} className="mb-2">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#2a4466" }}>
                      {label}
                    </p>
                    {items.map(({ href, label: itemLabel, icon: Icon, exact }) => {
                      const active = exact ? pathname === href : pathname.startsWith(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                          )}
                          style={active ? {
                            background: `linear-gradient(90deg, ${brandColor}18 0%, ${brandColor}08 100%)`,
                            borderLeft: `3px solid ${brandColor}`,
                          } : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" style={{ color: active ? brandColor : undefined }} />
                          {itemLabel}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Sign out */}
              <div className="p-4 shrink-0" style={{ borderTop: "1px solid rgba(180,210,240,0.08)" }}>
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                  style={{ color: "#3a5a7a" }}
                  onClick={() => setOpen(false)}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
