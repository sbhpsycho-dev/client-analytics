import { createServiceClient } from "@/lib/supabase/service";
import { StaffClient } from "./StaffClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const sb = createServiceClient();
  const { data: staff } = await sb
    .from("staff_accounts")
    .select("id, name, email, role, sheet_id, sheet_tab, active, created_at")
    .order("created_at", { ascending: false });

  return <StaffClient initialStaff={staff ?? []} />;
}
