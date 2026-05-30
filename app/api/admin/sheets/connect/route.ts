import { NextResponse } from "next/server";
import { getOAuthUrl } from "@/lib/google/oauth";
import { isAgencyStaff } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAgencyStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tenantId } = await request.json();
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64url");
  const url = getOAuthUrl(state);
  return NextResponse.json({ url });
}
