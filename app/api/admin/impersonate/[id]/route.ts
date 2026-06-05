import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHmac } from "crypto";
import { authOptions } from "@/lib/auth";

function makeToken(staffId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? process.env.MASTER_PASSWORD ?? "";
  const window = Math.floor(Date.now() / 30_000); // 30-second window
  return createHmac("sha256", secret).update(`${staffId}:${window}`).digest("hex");
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const token = makeToken(id);
  return NextResponse.json({ token, staffId: id });
}
