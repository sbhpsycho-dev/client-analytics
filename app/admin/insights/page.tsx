"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, BarChart2, TrendingUp, Users, DollarSign } from "lucide-react";

interface PipelineData {
  callsMade: number; demosSet: number; demosShowed: number; closed: number;
  showRate: number; closeRate: number; demoToClose: number;
}

interface LeaderboardData {
  leaderboard: { name: string; cashCollected: number; dealsClosed: number; closeRate: number }[];
  totalCash: number; totalDeals: number; totalCalls: number; avgCloseRate: number;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="px-4 py-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}

function fmt$(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function InsightsPage() {
  const [pipeline, setPipeline]         = useState<PipelineData | null>(null);
  const [leaderboard, setLeaderboard]   = useState<LeaderboardData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [pRes, lRes] = await Promise.all([
        fetch("/api/admin/pipeline"),
        fetch("/api/admin/leaderboard"),
      ]);
      if (pRes.ok) setPipeline(await pRes.json());
      if (lRes.ok) setLeaderboard(await lRes.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !pipeline) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-orange-500" />
            Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Month-to-date across all clients</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="h-8 px-3 rounded-lg bg-muted text-xs flex items-center gap-1.5 hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Revenue KPIs */}
      {leaderboard && (
        <>
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-orange-500" /> Revenue</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Total Cash Collected" value={fmt$(leaderboard.totalCash)} />
              <MetricCard label="Deals Closed" value={leaderboard.totalDeals} />
              <MetricCard label="Total Calls" value={leaderboard.totalCalls} />
              <MetricCard label="Avg Close Rate" value={`${leaderboard.avgCloseRate}%`} />
            </div>
          </div>

          {/* Top performers */}
          {leaderboard.leaderboard.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-orange-500" /> Top Performers</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Rep", "Cash Collected", "Deals Closed", "Close Rate"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.leaderboard.slice(0, 10).map((r) => (
                      <tr key={r.name} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium">{r.name}</td>
                        <td className="px-3 py-2.5 text-green-400 font-semibold">{fmt$(r.cashCollected)}</td>
                        <td className="px-3 py-2.5">{r.dealsClosed}</td>
                        <td className="px-3 py-2.5">
                          <span className={r.closeRate >= 30 ? "text-green-400" : r.closeRate >= 15 ? "text-orange-400" : "text-red-400"}>
                            {r.closeRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pipeline KPIs */}
      {pipeline && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-500" /> Pipeline</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Calls Made" value={pipeline.callsMade} />
            <MetricCard label="Demos Set" value={pipeline.demosSet} />
            <MetricCard label="Demos Showed" value={pipeline.demosShowed} />
            <MetricCard label="Deals Closed" value={pipeline.closed} />
            <MetricCard label="Show Rate" value={`${pipeline.showRate}%`} />
            <MetricCard label="Close Rate" value={`${pipeline.closeRate}%`} />
            <MetricCard label="Demo → Close" value={`${pipeline.demoToClose}%`} />
          </div>
        </div>
      )}
    </div>
  );
}
