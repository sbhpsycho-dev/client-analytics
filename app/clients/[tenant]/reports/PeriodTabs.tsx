"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PERIODS = [
  { key: "mtd", label: "Month to Date" },
  { key: "qtd", label: "Quarter to Date" },
  { key: "ytd", label: "Year to Date" },
] as const;

export function PeriodTabs({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl p-1"
      style={{
        background: "rgba(13,24,40,0.8)",
        border: "1px solid rgba(180,210,240,0.08)",
      }}
    >
      {PERIODS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => select(key)}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150"
            style={isActive ? {
              background: "linear-gradient(135deg, rgba(42,79,138,0.50) 0%, rgba(26,48,100,0.50) 100%)",
              color: "#dce8f4",
              border: "1px solid rgba(180,210,240,0.14)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            } : {
              color: "#4a6a8a",
              border: "1px solid transparent",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
