import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function GET() {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  // Fetch all non-excluded calls across all active tenants (current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: calls, error: dbErr } = await service
    .from("calls")
    .select("setter, closer, status, outcome, cash_collected")
    .eq("excluded", false)
    .gte("date", startOfMonth.toISOString().slice(0, 10));

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const rows = calls ?? [];

  // Build combined rep map (setters by bookings, closers by cash)
  type RepStats = {
    callsMade: number;
    demosSet: number;
    demosShowed: number;
    dealsClosed: number;
    cashCollected: number;
  };
  const repMap = new Map<string, RepStats>();

  function get(name: string): RepStats {
    return repMap.get(name) ?? { callsMade: 0, demosSet: 0, demosShowed: 0, dealsClosed: 0, cashCollected: 0 };
  }

  for (const c of rows) {
    if (c.setter) {
      const s = get(c.setter);
      s.callsMade++;
      s.demosSet++;
      if (c.status === "showed") s.demosShowed++;
      repMap.set(c.setter, s);
    }
    if (c.closer && c.outcome === "closed") {
      const s = get(c.closer);
      s.dealsClosed++;
      s.cashCollected += c.cash_collected ?? 0;
      repMap.set(c.closer, s);
    }
  }

  const leaderboard = Array.from(repMap.entries()).map(([name, s]) => ({
    name,
    cashCollected: s.cashCollected,
    callsMade: s.callsMade,
    demosSet: s.demosSet,
    demosShowed: s.demosShowed,
    dealsClosed: s.dealsClosed,
    showRate: s.demosSet > 0 ? parseFloat(((s.demosShowed / s.demosSet) * 100).toFixed(1)) : 0,
    closeRate: s.demosShowed > 0 ? parseFloat(((s.dealsClosed / s.demosShowed) * 100).toFixed(1)) : 0,
  }));

  const totalCash = leaderboard.reduce((s, r) => s + r.cashCollected, 0);
  const totalDeals = leaderboard.reduce((s, r) => s + r.dealsClosed, 0);
  const totalCalls = leaderboard.reduce((s, r) => s + r.callsMade, 0);
  const avgCloseRate =
    leaderboard.length > 0
      ? parseFloat((leaderboard.reduce((s, r) => s + r.closeRate, 0) / leaderboard.length).toFixed(1))
      : 0;

  return NextResponse.json({
    leaderboard,
    totalCash,
    totalDeals,
    totalCalls,
    avgCloseRate,
    source: leaderboard.length > 0 ? "sheet" : "empty",
  });
}
