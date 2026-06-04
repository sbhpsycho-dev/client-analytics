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

  // Build the row to append based on role
  let row: string[];
  if (staffRole === "setter") {
    const { callsBooked = 0, demosScheduled = 0 } = body;
    row = [date, name ?? "", "setter", String(callsBooked), String(demosScheduled)];
  } else {
    const { callsMade = 0, dealsClosed = 0, cashCollected = 0 } = body;
    row = [date, name ?? "", "closer", String(callsMade), String(dealsClosed), String(cashCollected)];
  }

  // Use the service account token — it has access to all rep sheets
  const accessToken = await getServiceAccountToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in your environment." },
      { status: 500 }
    );
  }

  try {
    await sheetsAppend(accessToken, sheetId, `${sheetTab ?? "Sheet1"}!A:Z`, [row]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to write to sheet: ${msg}` }, { status: 500 });
  }
}
