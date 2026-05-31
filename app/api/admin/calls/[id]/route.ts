import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { id } = await params;
  const { error: dbErr } = await service
    .from("calls")
    .update({ excluded: true, exclusion_reason: "manually deleted" })
    .eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
