import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAuth } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { service, error } = await requireAdminAuth();
  if (error || !service) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });

  const { id } = await params;
  const { error: dbErr } = await service
    .from("leads")
    .update({ excluded: true })
    .eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  revalidatePath("/clients/[tenant]", "page");
  return NextResponse.json({ ok: true });
}
