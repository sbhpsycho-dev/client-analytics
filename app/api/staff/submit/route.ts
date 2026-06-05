import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sheetsAppend } from "@/lib/google/sheets";
import { getServiceAccountToken } from "@/lib/google/service-account";

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

  // Production sheet format (Fadi/Conner/Kevin style):
  // Col A: Day of Month, B: Calls Made, C: DMs, D: Call Connects,
  // E: Appointment Sets, F: Demos Showed, G: Intro Units, H: Major Units,
  // I: Sales, J: Collections, K: Terms/Status, L: Overall Total Commissions
  const isProductionFormat = "callsMade" in body || "appointmentSets" in body;

  let row: string[];
  if (isProductionFormat) {
    const day = new Date(date).getDate();
    row = [
      String(day),
      String(body.callsMade       ?? 0),
      String(body.dms             ?? 0),
      String(body.callConnects    ?? 0),
      String(body.appointmentSets ?? 0),
      String(body.demosShowed     ?? 0),
      String(body.introUnits      ?? 0),
      String(body.majorUnits      ?? 0),
      String(body.sales           ?? 0),
      String(body.collections     ?? 0),
      body.termsStatus ?? "",
      String(body.commissions     ?? 0),
    ];
  } else if (staffRole === "setter") {
    const { callsBooked = 0, demosScheduled = 0 } = body;
    row = [date, name ?? "", "setter", String(callsBooked), String(demosScheduled)];
  } else {
    const { callsMade = 0, dealsClosed = 0, cashCollected = 0 } = body;
    row = [date, name ?? "", "closer", String(callsMade), String(dealsClosed), String(cashCollected)];
  }

  const accessToken = await getServiceAccountToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_REFRESH_TOKEN." },
      { status: 500 }
    );
  }

  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                   "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const tab = isProductionFormat
    ? MONTHS[new Date().getMonth()]
    : (sheetTab ?? "Sheet1");

  try {
    await sheetsAppend(accessToken, sheetId, `${tab}!A:L`, [row]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to write to sheet: ${msg}` }, { status: 500 });
  }
}
