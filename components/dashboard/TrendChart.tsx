"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint } from "@/lib/analytics/kpis";

interface TrendChartProps {
  data: TrendPoint[];
  metric: "callsBooked" | "revenue" | "showRate";
  color?: string;
}

const LABELS: Record<string, string> = {
  callsBooked: "Calls Booked",
  revenue: "Revenue ($)",
  showRate: "Show Rate (%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}
          {p.dataKey === "showRate" ? "%" : ""}
          {p.dataKey === "revenue" ? " USD" : ""}
        </p>
      ))}
    </div>
  );
};

export function TrendChart({ data, metric, color = "#8b5cf6" }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No trend data for this period
      </div>
    );
  }

  const gradId = `grad-${metric}`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,210,240,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#4a6a8a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          tick={{ fill: "#4a6a8a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={metric}
          name={LABELS[metric]}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
