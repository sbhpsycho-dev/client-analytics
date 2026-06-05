"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn, Loader2 } from "lucide-react";

export function ImpersonateButton({ staffId }: { staffId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/impersonate/${staffId}`, { method: "POST" });
      if (!res.ok) { alert("Failed to generate login token"); setLoading(false); return; }
      const { token } = await res.json();
      const result = await signIn("impersonate", { token, staffId, redirect: false });
      if (!result?.ok) { alert("Impersonation failed"); setLoading(false); return; }
      window.location.href = "/staff";
    } catch {
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: "linear-gradient(135deg, #1e3a6e, #2a4f8a)",
        border: "1px solid rgba(180,210,240,0.18)",
        color: "#dce8f4",
        boxShadow: "0 2px 8px rgba(26,50,110,0.4)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.15)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ""; }}
    >
      {loading
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <LogIn className="h-3 w-3" />}
      Log In as Rep
    </button>
  );
}
