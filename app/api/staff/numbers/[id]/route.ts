import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isStaff || !session.user.staffId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = createServiceClient();

  // Only delete if the row belongs to this rep
  const { error } = await service
    .from("daily_numbers")
    .delete()
    .eq("id", id)
    .eq("staff_id", session.user.staffId);

  if (error) {
    console.error("[staff/numbers DELETE]", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }

  revalidatePath("/staff");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
