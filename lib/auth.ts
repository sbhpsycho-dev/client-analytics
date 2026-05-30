import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type SystemRole = "agency_admin" | "agency_agent" | "client";
export type TenantRole = "client_owner" | "client_manager" | "client_setter" | "client_closer";

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(): Promise<Tables<"user_profiles"> | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}

export async function getUserTenants() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(id, slug, name, logo_url, brand_color, default_theme, status)")
    .eq("user_id", user.id)
    .eq("invite_status", "accepted");
  return data ?? [];
}

export async function isAgencyStaff(): Promise<boolean> {
  const profile = await getUserProfile();
  return profile?.system_role === "agency_admin" || profile?.system_role === "agency_agent";
}

export async function isAgencyAdmin(): Promise<boolean> {
  const profile = await getUserProfile();
  return profile?.system_role === "agency_admin";
}
