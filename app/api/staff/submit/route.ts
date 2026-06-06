import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
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

  const { staffId, sheetId, name } = session.user;
  if (!staffId) {
    return NextResponse.json({ error: "Staff account ID missing from session. Please log out and back in." }, { status: 400 });
  }

  const body = await req.json();
  const {
    date,
    callsMade   = 0,
    dms         = 0,
    connects    = 0,
    set         = 0,
    show        = 0,
    introUnits  = 0,
    majorUnits  = 0,
    sales       = 0,
    collections = 0,
    commissions = 0,
    termsStatus = "",
  } = body;

  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const service = createServiceClient();

  // ── 1. Write to Supabase (source of truth) ──────────────────────────────────
  const { data: entry, error: dbErr } = await service
    .from("daily_numbers")
    .upsert(
      {
        staff_id:     staffId,
        date,
        calls_made:   Number(callsMade),
        dms:          Number(dms),
        connects:     Number(connects),
        sets:         Number(set),
        shows:        Number(show),
        intro_units:  Number(introUnits),
        major_units:  Number(majorUnits),
        sales:        Number(sales),
        collections:  Number(String(collections).replace(/[$,]/g, "")),
        commissions:  Number(String(commissions).replace(/[$,]/g, "")),
        terms_status: String(termsStatus).trim(),
        sheets_synced: false,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: "staff_id,date" }
    )
    .select("id")
    .single();

  if (dbErr || !entry) {
    console.error("[staff/submit] Supabase write failed:", dbErr);
    return NextResponse.json({ error: "Failed to save your numbers. Please try again." }, { status: 500 });
  }

  // Bust cache immediately — dashboards read from Supabase so this is instant
  revalidatePath("/staff");
  revalidatePath("/admin");

  // ── 2. Mirror to Google Sheets (non-blocking) ───────────────────────────────
  if (sheetId) {
    const day = new Date(date).getDate();
    const row = [
      String(day),
      String(callsMade),
      String(dms),
      String(connects),
      String(set),
      String(show),
      String(introUnits),
      String(majorUnits),
      String(sales),
      String(collections).replace(/[$,]/g, ""),
      String(termsStatus).trim(),
      String(commissions).replace(/[$,]/g, ""),
    ];

    (async () => {
      try {
        const accessToken = await getServiceAccountToken();
        if (!accessToken) return;
        const targetMonth = MONTHS[new Date().getMonth()];
        let tabName = targetMonth;
        try {
          const tabs = await sheetMeta(sheetId);
          const match = tabs.find(t => t.toUpperCase().trim() === targetMonth);
          if (match) tabName = match;
        } catch { /* use default */ }
        await sheetsAppend(accessToken, sheetId, `${tabName}!A:L`, [row]);
        await service.from("daily_numbers").update({ sheets_synced: true }).eq("id", entry.id);
      } catch (err) {
        console.error("[staff/submit] Sheets mirror failed (data saved in Supabase):", err);
        // sheets_synced stays false — will be retried next sync
      }
    })();
  }

  return NextResponse.json({ success: true, entryId: entry.id });
}
