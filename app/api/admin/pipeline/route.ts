import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function GET() {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: calls, error: dbErr } = await service
    .from("calls")
    .select("setter, status, outcome, cash_collected")
    .eq("excluded", false)
    .gte("date", startOfMonth.toISOString().slice(0, 10));

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const rows = calls ?? [];
  const callsMade = rows.filter((c) => c.setter).length;
  const demosSet = callsMade;
  const demosShowed = rows.filter((c) => c.status === "showed").length;
  const pitched = demosShowed;
  const closed = rows.filter((c) => c.outcome === "closed").length;

  const showRate = demosSet > 0 ? parseFloat(((demosShowed / demosSet) * 100).toFixed(1)) : 0;
  const closeRate = demosShowed > 0 ? parseFloat(((closed / demosShowed) * 100).toFixed(1)) : 0;
  const demoToClose = demosSet > 0 ? parseFloat(((closed / demosSet) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    callsMade,
    callsAnswered: callsMade,
    demosSet,
    demosShowed,
    pitched,
    closed,
    answerRate: 100,
    showRate,
    closeRate,
    demoToClose,
    stageBreakdown: [],
  });
}
