import { getServiceAccountToken } from "@/lib/google/service-account";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ── Auth-aware fetch helpers ───────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string> | null> {
  const saToken = await getServiceAccountToken();
  if (saToken) return { Authorization: `Bearer ${saToken}` };

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) return null; // signals "use ?key= param instead"

  return null;
}

function buildUrl(path: string, queryParams?: string): string {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  // Service account is preferred; only append key if no SA is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && apiKey) {
    return `${path}${queryParams ? `?${queryParams}&` : "?"}key=${encodeURIComponent(apiKey)}`;
  }
  return queryParams ? `${path}?${queryParams}` : path;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function apiKeySheetGet(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  return sheetGet(spreadsheetId, range);
}

export async function apiKeySheetMeta(spreadsheetId: string): Promise<string[]> {
  return sheetMeta(spreadsheetId);
}

// Auth-aware sheet value fetch (used by sheet-metrics)
export async function sheetGet(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const hasAuth = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_REFRESH_TOKEN;
  if (!hasAuth) return [];

  const url = buildUrl(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );

  try {
    const headers = await authHeaders();
    const res = await fetch(url, {
      headers: headers ?? {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.values as string[][]) ?? [];
  } catch {
    return [];
  }
}

// Auth-aware sheet tab list fetch
export async function sheetMeta(spreadsheetId: string): Promise<string[]> {
  const hasAuth = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_REFRESH_TOKEN;
  if (!hasAuth) return [];

  const url = buildUrl(
    `${SHEETS_BASE}/${spreadsheetId}`,
    "fields=sheets.properties.title",
  );

  try {
    const headers = await authHeaders();
    const res = await fetch(url, {
      headers: headers ?? {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.sheets as { properties: { title: string } }[]) ?? []).map(
      (s) => s.properties.title
    );
  } catch {
    return [];
  }
}
