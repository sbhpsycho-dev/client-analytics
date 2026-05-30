import type { SetterStat } from "@/lib/analytics/kpis";

const MEDALS = [
  { border: "#F59E0B", badge: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { border: "#94A3B8", badge: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
  { border: "#CD7C54", badge: "#CD7C54", bg: "rgba(205,124,84,0.08)" },
];

function rateColor(pct: number) {
  if (pct >= 70) return "#34d399";
  if (pct >= 40) return "#f59e0b";
  return "#f87171";
}

export function SetterLeaderboard({ data }: { data: SetterStat[] }) {
  if (!data.length) {
    return <p className="text-sm py-4 text-center" style={{ color: "#4a6a8a" }}>No setter data yet</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((s, i) => {
        const medal = MEDALS[i];
        return (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-lg px-3 py-3"
            style={{
              background: medal ? medal.bg : "rgba(180,210,240,0.03)",
              border: `1px solid ${medal ? medal.border + "40" : "rgba(180,210,240,0.07)"}`,
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                backgroundColor: medal ? medal.badge + "25" : "rgba(180,210,240,0.08)",
                color: medal ? medal.badge : "#4a6a8a",
              }}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "#dce8f4" }}>{s.name}</p>
            </div>
            <div className="flex items-center gap-5 text-xs tabular-nums">
              <div className="text-center">
                <p style={{ color: "#4a6a8a" }}>Bookings</p>
                <p className="font-bold" style={{ color: "#dce8f4" }}>{s.bookings}</p>
              </div>
              <div className="text-center">
                <p style={{ color: "#4a6a8a" }}>Show %</p>
                <p className="font-bold" style={{ color: rateColor(s.showRate) }}>{s.showRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
