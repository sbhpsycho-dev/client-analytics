import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sheetsAppend } from "@/lib/google/sheets";
import { getServiceAccountToken } from "@/lib/google/service-account";

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                 "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sheetId, sheetTab, name, staffRole } = session.user;
  if (!sheetId) {
    return NextResponse.json(
      { error: "No sheet linked to your account. Ask your admin to add your sheet URL in the Staff roster." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { date } = body;
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  // Build row matching sheet columns:
  // Date | Rep | Closer | Made | Ans | NS | Can | Set | Show | Pitch | Close | Cash | Leads | Refunds
  // Percentage columns (Ans%, Show%, Pitch%, Close%, D→C%) are sheet formulas — leave blank
  const isNewFormat = "made" in body || "set" in body;

  let row: string[];
  if (isNewFormat) {
    row = [
      date,
      name ?? "",
      "",                              // Closer — blank for reps
      String(body.made    ?? 0),
      String(body.ans     ?? 0),
      String(body.ns      ?? 0),
      String(body.can     ?? 0),
      String(body.set     ?? 0),
      String(body.show    ?? 0),
      String(body.pitch   ?? 0),
      String(body.close   ?? 0),
      String(body.cash    ?? 0),
      String(body.leads   ?? 0),
      String(body.refunds ?? 0),
      // Leave Ans%, Show%, Pitch%, Close%, D→C% blank — sheet calculates them
      "", "", "", "", "",
    ];
  } else if (staffRole === "setter") {
    const { callsBooked = 0, demosScheduled = 0 } = body;
    row = [date, name ?? "", "setter", String(callsBooked), String(demosScheduled)];
  } else {
    const { callsMade = 0, dealsClosed = 0, cashCollected = 0 } = body;
    row = [date, name ?? "", "closer", String(callsMade), String(dealsClosed), String(cashCollected)];
  }

  // Use current month tab for production sheets; otherwise use configured tab
  const tab = isNewFormat
    ? MONTHS[new Date().getMonth()]
    : (sheetTab ?? "Sheet1");

  const accessToken = await getServiceAccountToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_REFRESH_TOKEN." },
      { status: 500 }
    );
  }

  try {
    await sheetsAppend(accessToken, sheetId, `${tab}!A:S`, [row]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to write to sheet: ${msg}` }, { status: 500 });
  }
}
