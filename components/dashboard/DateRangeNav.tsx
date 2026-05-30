"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Props {
  from: string;
  to: string;
}

export function DateRangeNav({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: "from" | "to", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const resetMTD = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const INPUT = "rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-zinc-500">From</label>
        <input
          type="date"
          className={INPUT}
          value={from}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-zinc-500">To</label>
        <input
          type="date"
          className={INPUT}
          value={to}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>
      <button
        onClick={resetMTD}
        className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
      >
        Reset to MTD
      </button>
    </div>
  );
}
