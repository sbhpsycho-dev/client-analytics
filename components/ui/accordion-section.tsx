"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  className?: string;
}

export function AccordionSection({
  title,
  children,
  defaultOpen = true,
  storageKey,
  className = "",
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(`accordion:${storageKey}`);
    if (stored !== null) setOpen(stored === "true");
    initialized.current = true;
  }, [storageKey]);

  // Persist to localStorage on change (after first mount read)
  useEffect(() => {
    if (!storageKey || !initialized.current) return;
    localStorage.setItem(`accordion:${storageKey}`, String(open));
  }, [open, storageKey]);

  return (
    <div className={`space-y-0 ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 px-0 group select-none"
        aria-expanded={open}
      >
        <span
          className="text-xs font-bold uppercase tracking-[0.18em] transition-colors"
          style={{ color: open ? "#7a9ab8" : "#3a5a7a" }}
        >
          {title}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{
            color: "#3a5a7a",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        />
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: open ? "9999px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
