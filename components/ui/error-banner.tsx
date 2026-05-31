"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  detail?: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, detail, onDismiss }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm"
      style={{
        background: "linear-gradient(135deg, rgba(120,50,10,0.35) 0%, rgba(80,30,5,0.25) 100%)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug" style={{ color: "#fcd34d" }}>{message}</p>
        {detail && (
          <p className="text-xs mt-0.5 leading-snug" style={{ color: "#92400e" }}>{detail}</p>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 p-0.5 rounded transition-opacity hover:opacity-70"
        style={{ color: "#92400e" }}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
