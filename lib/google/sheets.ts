export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Sheets append error ${res.status}: ${json.error?.message ?? JSON.stringify(json.error)}`);
  }
}

export async function sheetsGet(accessToken: string, spreadsheetId: string, range: string) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Sheets API error ${res.status}: ${json.error?.message ?? JSON.stringify(json.error)}`);
  }
  return json as { values?: string[][] };
}

export async function getSheetMetadata(accessToken: string, spreadsheetId: string) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Sheets metadata error: ${json.error?.message}`);
  }
  return json as { sheets: Array<{ properties: { title: string; sheetId: number } }> };
}

export function getSheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

// Fetch the first row of a tab to get column headers
export async function getSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  tabName: string
): Promise<string[]> {
  const result = await sheetsGet(accessToken, spreadsheetId, `${tabName}!1:1`);
  return (result.values?.[0] ?? []).map((h: string) => h.trim());
}
