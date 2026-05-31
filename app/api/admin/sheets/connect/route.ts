import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getOAuthUrl } from "@/lib/google/oauth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tenantId } = await request.json();
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const payload = JSON.stringify({ tenantId, nonce: crypto.randomUUID() });
  const secret = process.env.SHEET_TOKEN_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const state = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");
  const url = getOAuthUrl(state);
  return NextResponse.json({ url });
}
