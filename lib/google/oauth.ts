const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`OAuth exchange failed: ${JSON.stringify(json)}`);
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? "",
    expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expiry_date: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(json)}`);
  return {
    access_token: json.access_token,
    expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}
