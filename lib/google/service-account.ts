import { google } from "googleapis";
import { refreshAccessToken } from "@/lib/google/oauth";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

export async function getServiceAccountToken(): Promise<string | null> {
  // Return cached token if still valid (keep 5-min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  // Path 1: Service account JSON (preferred)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const token = await auth.getAccessToken();
      if (!token) return null;
      cachedToken = { token, expiresAt: Date.now() + 3_600_000 };
      return token;
    } catch (err) {
      console.error("[service-account] Service account auth failed:", err);
    }
  }

  // Path 2: OAuth refresh token (fallback)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      const result = await refreshAccessToken(process.env.GOOGLE_REFRESH_TOKEN);
      cachedToken = { token: result.access_token, expiresAt: result.expiry_date };
      return result.access_token;
    } catch (err) {
      console.error("[service-account] Refresh token auth failed:", err);
    }
  }

  return null;
}
