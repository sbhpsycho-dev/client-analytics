"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Incorrect credentials",
  invalid_invite: "This invite link is invalid.",
  invite_expired: "This invite has already been used or expired.",
  invite_wrong_account: "Please log in with the email address this invite was sent to.",
};

type Tab = "admin" | "staff";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("admin");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [staffPw, setStaffPw] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) toast.error(ERROR_MESSAGES[err] ?? "Login failed");
  }, []);

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    const raw = new URLSearchParams(window.location.search).get("callbackUrl") || "/admin";
    const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";
    startTransition(async () => {
      const result = await signIn("credentials", { password, redirect: false });
      if (!result?.ok || result?.error) {
        toast.error("Incorrect password");
        return;
      }
      window.location.href = callbackUrl;
    });
  }

  function handleStaffLogin(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await signIn("staff", { email: email.trim(), password: staffPw, redirect: false });
      if (!result?.ok || result?.error) {
        toast.error("Invalid email or password");
        return;
      }
      window.location.href = "/staff";
    });
  }

  const TAB_ACTIVE: React.CSSProperties = {
    background: "rgba(74,122,181,0.2)",
    border: "1px solid rgba(74,122,181,0.45)",
    color: "#dce8f4",
  };
  const TAB_INACTIVE: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(180,210,240,0.1)",
    color: "#4a6a8a",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #080f1e 0%, #0d1828 40%, #0a1525 70%, #080f1e 100%)" }}
    >
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(42,79,138,0.22) 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-sm space-y-10 relative">

        {/* Logo */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: "rgba(168,192,214,0.20)", transform: "scale(1.4)" }}
            />
            <svg width="140" height="140" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-2xl">
              <defs>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#dce8f4" />
                  <stop offset="45%" stopColor="#a8c0d6" />
                  <stop offset="100%" stopColor="#7a9ab8" />
                </linearGradient>
                <linearGradient id="shieldGradInner" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id="silverGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e3a6e" />
                  <stop offset="50%" stopColor="#152d58" />
                  <stop offset="100%" stopColor="#0e1e3c" />
                </linearGradient>
                <linearGradient id="arrowGrad" x1="34" y1="22" x2="54" y2="18" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1a3462" />
                  <stop offset="100%" stopColor="#2a4f8a" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <path d="M40 4 L72 16 L72 42 C72 58 57 70 40 76 C23 70 8 58 8 42 L8 16 Z" fill="url(#shieldGrad)" />
              <path d="M40 4 L72 16 L72 42 C72 58 57 70 40 76 C23 70 8 58 8 42 L8 16 Z" fill="url(#shieldGradInner)" />
              <path d="M40 4 L72 16 L72 42 C72 58 57 70 40 76 C23 70 8 58 8 42 L8 16 Z" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
              <rect x="20" y="44" width="8" height="16" rx="1.5" fill="url(#silverGrad)" opacity="0.65" filter="url(#glow)" />
              <rect x="31" y="36" width="8" height="24" rx="1.5" fill="url(#silverGrad)" opacity="0.8" filter="url(#glow)" />
              <rect x="42" y="28" width="8" height="32" rx="1.5" fill="url(#silverGrad)" filter="url(#glow)" />
              <path d="M34 26 L54 18 M54 18 L54 27 M54 18 L45 18" stroke="url(#arrowGrad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
            </svg>
          </div>
          <div className="text-center space-y-1.5">
            <h1 className="text-5xl font-black tracking-[0.12em] uppercase leading-none"
              style={{
                background: "linear-gradient(180deg, #eaf2fc 0%, #c8daea 45%, #9ab8d0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.14em",
              }}>
              LeadWell
            </h1>
            <div className="flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(100,140,180,0.5))" }} />
              <p className="text-sm tracking-[0.4em] uppercase font-semibold" style={{ color: "#6a8eae" }}>Advisors</p>
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(100,140,180,0.5), transparent)" }} />
            </div>
          </div>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-7 space-y-6"
          style={{
            background: "linear-gradient(160deg, #121e32 0%, #0e1929 50%, #0c1622 100%)",
            border: "1px solid rgba(180,210,240,0.10)",
            borderTop: "1px solid rgba(180,210,240,0.18)",
            boxShadow: "0 25px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(180,210,240,0.04) inset, 0 1px 0 rgba(180,210,240,0.12) inset",
          }}
        >
          {/* Tab toggle */}
          <div className="flex gap-2">
            {(["admin", "staff"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all"
                style={tab === t ? TAB_ACTIVE : TAB_INACTIVE}
              >
                {t === "admin" ? "Admin" : "Rep Login"}
              </button>
            ))}
          </div>

          {tab === "admin" ? (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium" style={{ color: "#8aaabf" }}>Admin Access</p>
                <p className="text-xs" style={{ color: "#3d5a72" }}>Enter master password</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="h-12 text-center tracking-widest text-base rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(180,210,240,0.12)",
                    color: "#dce8f4",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
                <Button
                  type="submit"
                  className="w-full h-12 font-semibold tracking-wide rounded-xl text-sm"
                  disabled={isPending}
                  style={{
                    background: "linear-gradient(135deg, #1e3a6e 0%, #2a4f8a 50%, #1e3f7a 100%)",
                    border: "1px solid rgba(180,210,240,0.18)",
                    color: "#dce8f4",
                    boxShadow: "0 4px 20px rgba(26,50,110,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium" style={{ color: "#8aaabf" }}>Rep Dashboard</p>
                <p className="text-xs" style={{ color: "#3d5a72" }}>Sign in with your rep credentials</p>
              </div>
              <form onSubmit={handleStaffLogin} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  autoComplete="email"
                  className="h-12 text-base rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(180,210,240,0.12)",
                    color: "#dce8f4",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
                <Input
                  type="password"
                  value={staffPw}
                  onChange={(e) => setStaffPw(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="h-12 text-center tracking-widest text-base rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(180,210,240,0.12)",
                    color: "#dce8f4",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
                <Button
                  type="submit"
                  className="w-full h-12 font-semibold tracking-wide rounded-xl text-sm"
                  disabled={isPending}
                  style={{
                    background: "linear-gradient(135deg, #1e3a6e 0%, #2a4f8a 50%, #1e3f7a 100%)",
                    border: "1px solid rgba(180,210,240,0.18)",
                    color: "#dce8f4",
                    boxShadow: "0 4px 20px rgba(26,50,110,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs tracking-wider" style={{ color: "#2a3f52" }}>
          Sales Analytics Platform &nbsp;·&nbsp; LeadWell Advisors
        </p>
      </div>
    </div>
  );
}
