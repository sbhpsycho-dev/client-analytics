import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function POST() {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error: dbErr } = await service
    .from("calls")
    .update({ excluded: true }, { count: "exact" })
    .eq("excluded", false)
    .gte("date", startOfMonth.toISOString().slice(0, 10));

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ reset: true, count: count ?? 0 });
}
