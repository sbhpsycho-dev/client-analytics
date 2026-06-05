import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sheetsAppend } from "@/lib/google/sheets";
import { getServiceAccountToken } from "@/lib/google/service-account";
import { sheetMeta } from "@/lib/google/api-key-reader";

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                 "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sheetId, name } = session.user;
  if (!sheetId) {
    return NextResponse.json(
      { error: "No sheet linked to your account. Ask your admin to add your sheet URL in the Staff roster." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { date, callsMade = 0, dms = 0, connects = 0, set = 0, show = 0, sales = 0, collections = 0 } = body;
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  // Day number for col A (Day of Month)
  const day = new Date(date).getDate();

  // Row matches actual sheet column order:
  // A: Day of Month | B: Calls Made | C: DMs | D: Call Connects | E: Appointment Sets
  // F: Demos Showed | G: Intro Units (blank) | H: Major Units (blank)
  // I: Sales | J: Collections | K: Terms/Status (blank) | L: Overall Total Commissions (blank)
  const row = [
    String(day),
    String(callsMade),
    String(dms),
    String(connects),
    String(set),
    String(show),
    "",   // G: Intro Units
    "",   // H: Major Units
    String(sales),
    String(collections),
    "",   // K: Terms/Status
    "",   // L: Commissions (formula)
  ];

  const accessToken = await getServiceAccountToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_REFRESH_TOKEN." },
      { status: 500 }
    );
  }

  // Find the actual tab name (case-insensitive match for current month)
  const targetMonth = MONTHS[new Date().getMonth()];
  let tabName = targetMonth;
  try {
    const tabs = await sheetMeta(sheetId);
    const match = tabs.find(t => t.toUpperCase().trim() === targetMonth);
    if (match) tabName = match;
  } catch {
    // Fall through with default
  }

  try {
    await sheetsAppend(accessToken, sheetId, `${tabName}!A:L`, [row]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to write to sheet: ${msg}` }, { status: 500 });
  }
}
