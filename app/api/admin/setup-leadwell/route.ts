import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { google } from "googleapis";
import { randomBytes, pbkdf2Sync } from "crypto";

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();
  if (!["agency_admin", "agency_agent"].includes(profile?.system_role ?? "")) return null;
  return user;
}

// ─── Password ─────────────────────────────────────────────────────────────────

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(plain, salt, 100_000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

// ─── Sheet Headers ────────────────────────────────────────────────────────────

const DAILY_LOG_HEADERS = [
  "Date", "Name", "Calls Made", "Calls Answered", "Conversations", "Fact Finds",
  "Zooms Booked", "Zooms Showed", "No-Showed", "Show Rate", "Deals Closed", "Cash Collected",
];

const DEAL_LOG_HEADERS = [
  "Date", "Client Name", "Offer", "Gross Amount", "Processor", "Processor Fee",
  "Net After Fees", "Lead Source", "Setter", "Closer", "Caelum 15%", "Media Buyer 5%",
  "Setter Pay", "Closer Pay", "Total Payouts", "Evan Take Home", "Payout Status", "Notes", "Deal ID",
];

const DAILY_ACTIVITY_HEADERS = [
  "Date", "Name", "Calls Made", "Calls Answered", "Demos Set", "Demos Showed",
  "Pitched", "Closed", "Cash Collected",
];

// ─── Sheet Creator ────────────────────────────────────────────────────────────

function colLetter(count: number) {
  return String.fromCharCode(64 + count);
}

async function createSheet(
  sheets: ReturnType<typeof google.sheets>,
  drive: ReturnType<typeof google.drive>,
  title: string,
  tabName: string,
  headers: string[],
): Promise<{ id: string; url: string }> {
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: tabName, sheetId: 0 } }],
    },
  });
  const spreadsheetId = res.data.spreadsheetId!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1:${colLetter(headers.length)}1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      }],
    },
  });

  const shareEmail = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL;
  if (shareEmail) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: "writer", type: "user", emailAddress: shareEmail },
      sendNotificationEmail: false,
    });
  }

  return {
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SA_EMAIL,
      private_key: process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  const sheetsApi = google.sheets({ version: "v4", auth });
  const driveApi  = google.drive({ version: "v3", auth });

  const [kpiTracker, dealLog, izaiah, sylis, fadi, kevin] = await Promise.all([
    createSheet(sheetsApi, driveApi, "Leadwell KPI Tracker",      "Daily Log",      DAILY_LOG_HEADERS),
    createSheet(sheetsApi, driveApi, "Leadwell Deal Log",          "Deal Log",       DEAL_LOG_HEADERS),
    createSheet(sheetsApi, driveApi, "Leadwell — Izaiah Dingman", "Daily Activity", DAILY_ACTIVITY_HEADERS),
    createSheet(sheetsApi, driveApi, "Leadwell — Sylis Snyder",   "Daily Activity", DAILY_ACTIVITY_HEADERS),
    createSheet(sheetsApi, driveApi, "Leadwell — Fadi Lebsir",    "Daily Activity", DAILY_ACTIVITY_HEADERS),
    createSheet(sheetsApi, driveApi, "Leadwell — Kevin Korona",   "Daily Activity", DAILY_ACTIVITY_HEADERS),
  ]);

  const TEMP_PASSWORD = "leadwell2026";

  const staff = [
    { name: "Celest Fernandez", role: "closer",  sheetId: null },
    { name: "Izaiah Dingman",   role: "setter",  sheetId: izaiah.id },
    { name: "Sylis Snyder",     role: "setter",  sheetId: sylis.id },
    { name: "Fadi Lebsir",      role: "setter",  sheetId: fadi.id },
    { name: "Kevin Korona",     role: "setter",  sheetId: kevin.id },
  ].map(s => ({ ...s, passwordHash: hashPassword(TEMP_PASSWORD) }));

  return NextResponse.json({
    ok: true,
    tempPassword: TEMP_PASSWORD,
    staff: staff.map(({ name, role, sheetId }) => ({ name, role, sheetId })),
    sheets: { kpiTracker, dealLog, izaiah, sylis, fadi, kevin },
    envVars: {
      LEADWELL_SHEETS_KPI_ID: kpiTracker.id,
      LEADWELL_SHEETS_DEAL_LOG_ID: dealLog.id,
    },
    note: "Add staff to the dashboard via /admin/users — use temp password above.",
  });
}
