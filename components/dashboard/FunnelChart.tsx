"use client";

import type { Funnel } from "@/lib/analytics/kpis";

interface FunnelChartProps {
  funnel: Funnel;
  brandColor?: string;
}

export function FunnelChart({ funnel, brandColor = "#8b5cf6" }: FunnelChartProps) {
  const stages = [
    { label: "Leads", value: funnel.leads },
    { label: "Booked", value: funnel.booked },
    { label: "Showed", value: funnel.showed },
    { label: "Closed", value: funnel.closed },
  ];

  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-2.5">
      {stages.map((stage, i) => {
        const pct = (stage.value / max) * 100;
        const convRate = i > 0 && stages[i - 1].value > 0
          ? ((stage.value / stages[i - 1].value) * 100).toFixed(1)
          : null;

        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{stage.label}</span>
              <div className="flex items-center gap-2">
                {convRate && (
                  <span className="text-zinc-500">{convRate}% conv.</span>
                )}
                <span className="font-semibold text-white tabular-nums">{stage.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: brandColor, opacity: 1 - i * 0.15 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
