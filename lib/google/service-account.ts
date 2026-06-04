import { google } from "googleapis";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

export async function getServiceAccountToken(): Promise<string | null> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  // Return cached token if still valid (keep 5-min buffer before expiry)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const token = await auth.getAccessToken();
    if (!token) return null;

    cachedToken = {
      token,
      expiresAt: Date.now() + 3_600_000, // 1 hour
    };

    return token;
  } catch (err) {
    console.error("[service-account] Failed to get access token:", err);
    return null;
  }
}
