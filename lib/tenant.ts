import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export async function resolveTenantBySlug(slug: string): Promise<Tables<"tenants"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

export async function getUserTenantRole(tenantId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();
  return data?.role ?? null;
}

export async function getAllTenants() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("*, sheet_connections(last_synced_at, last_sync_status)")
    .order("created_at", { ascending: false });
  return data ?? [];
}
