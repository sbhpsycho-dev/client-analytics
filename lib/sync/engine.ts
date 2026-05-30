import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/google/encrypt";
import { refreshAccessToken } from "@/lib/google/oauth";
import { sheetsGet } from "@/lib/google/sheets";
import { sendSyncErrorAlert } from "@/lib/email";
import { transformRows } from "./transform";

export async function orchestrateSyncForTenant(tenantId: string): Promise<{
  ok: boolean;
  rowsImported: number;
  error?: string;
}> {
  const service = createServiceClient();

  // Load connection
  const { data: conn } = await service
    .from("sheet_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("sync_enabled", true)
    .single();

  if (!conn || conn.sheet_id === "PENDING") {
    return { ok: false, rowsImported: 0, error: "No active sheet connection" };
  }

  // Log sync start
  const { data: log } = await service
    .from("sync_logs")
    .insert({
      sheet_connection_id: conn.id,
      tenant_id: tenantId,
      status: "running",
    })
    .select()
    .single();

  const logId = log?.id;

  // Mark connection as running
  await service.from("sheet_connections").update({ last_sync_status: "running" }).eq("id", conn.id);

  let accessToken: string;
  try {
    if (!conn.oauth_access_token) throw new Error("No access token stored");

    accessToken = decrypt(conn.oauth_access_token as string);

    // Refresh if expired
    if (conn.oauth_token_expiry) {
      const expiry = new Date(conn.oauth_token_expiry).getTime();
      if (Date.now() > expiry - 60_000 && conn.oauth_refresh_token) {
        const refreshed = await refreshAccessToken(decrypt(conn.oauth_refresh_token as string));
        accessToken = refreshed.access_token;
        await service.from("sheet_connections").update({
          oauth_access_token: refreshed.access_token,
          oauth_token_expiry: new Date(refreshed.expiry_date).toISOString(),
        }).eq("id", conn.id);
      }
    }
  } catch (err: any) {
    return await handleSyncError(service, conn, logId, tenantId, err.message);
  }

  // Fetch sheet data
  let callRows: string[][] = [];
  let leadsRows: string[][] = [];
  let teamRows: string[][] = [];

  try {
    const [callsResult, leadsResult, teamResult] = await Promise.allSettled([
      sheetsGet(accessToken, conn.sheet_id, `${conn.tab_calls}!A:Z`),
      sheetsGet(accessToken, conn.sheet_id, `${conn.tab_leads}!A:Z`),
      sheetsGet(accessToken, conn.sheet_id, `${conn.tab_team}!A:Z`),
    ]);

    callRows = callsResult.status === "fulfilled" ? (callsResult.value.values ?? []) : [];
    leadsRows = leadsResult.status === "fulfilled" ? (leadsResult.value.values ?? []) : [];
    teamRows = teamResult.status === "fulfilled" ? (teamResult.value.values ?? []) : [];
  } catch (err: any) {
    return await handleSyncError(service, conn, logId, tenantId, err.message);
  }

  // Transform rows using column mapping
  const mapping = (conn.column_mapping as Record<string, Record<string, string>>) ?? {};
  const { calls, leads } = transformRows(tenantId, callRows, mapping);

  // Also transform leads from separate tab if different
  const leadsFromSeparateTab = conn.tab_leads !== conn.tab_calls
    ? transformRows(tenantId, leadsRows, mapping).leads
    : [];

  const allLeads = [...leads, ...leadsFromSeparateTab];

  // Team members (replace all for this tenant)
  const teamFromSheet = teamRows.slice(1).map((row, i) => ({
    tenant_id: tenantId,
    name: row[0] ?? null,
    role: (["setter", "closer", "manager"].includes((row[1] ?? "").toLowerCase())
      ? row[1].toLowerCase()
      : null) as "setter" | "closer" | "manager" | null,
    email: row[2] ?? null,
    active: !["false", "0", "no"].includes((row[3] ?? "").toLowerCase()),
  }));

  let rowsImported = 0;

  try {
    // Upsert calls
    if (calls.length > 0) {
      const { error } = await service
        .from("calls")
        .upsert(calls as any[], { onConflict: "tenant_id,sheet_row_index", ignoreDuplicates: false });
      if (error) throw new Error(`Calls upsert: ${error.message}`);
      rowsImported += calls.length;
    }

    // Upsert leads
    if (allLeads.length > 0) {
      const { error } = await service
        .from("leads")
        .upsert(allLeads as any[], { onConflict: "tenant_id,sheet_row_index", ignoreDuplicates: false });
      if (error) throw new Error(`Leads upsert: ${error.message}`);
      rowsImported += allLeads.length;
    }

    // Replace team members
    if (teamFromSheet.length > 0) {
      await service.from("team_members").delete().eq("tenant_id", tenantId);
      await service.from("team_members").insert(teamFromSheet);
      rowsImported += teamFromSheet.length;
    }
  } catch (err: any) {
    return await handleSyncError(service, conn, logId, tenantId, err.message);
  }

  // Mark success
  const now = new Date().toISOString();
  await Promise.all([
    service.from("sheet_connections").update({
      last_synced_at: now,
      last_sync_status: "success",
      last_sync_error: null,
    }).eq("id", conn.id),
    logId && service.from("sync_logs").update({
      completed_at: now,
      status: "success",
      rows_processed: callRows.length + leadsRows.length,
      rows_imported: rowsImported,
    }).eq("id", logId),
  ]);

  return { ok: true, rowsImported };
}

async function handleSyncError(
  service: ReturnType<typeof createServiceClient>,
  conn: any,
  logId: string | undefined,
  tenantId: string,
  errorMessage: string
) {
  const now = new Date().toISOString();
  await Promise.all([
    service.from("sheet_connections").update({
      last_sync_status: "error",
      last_sync_error: errorMessage,
    }).eq("id", conn.id),
    logId && service.from("sync_logs").update({
      completed_at: now,
      status: "error",
      error_message: errorMessage,
    }).eq("id", logId),
  ]);

  // Alert the assigned agent
  try {
    const { data: profile } = await service
      .from("user_profiles")
      .select("full_name")
      .eq("id", conn.agent_user_id)
      .single();

    const { data: agentUser } = await service.auth.admin.getUserById(conn.agent_user_id);
    const { data: tenant } = await service.from("tenants").select("name").eq("id", tenantId).single();

    if (agentUser?.user?.email && tenant?.name) {
      await sendSyncErrorAlert(agentUser.user.email, tenant.name, errorMessage).catch(() => {});
    }
  } catch {
    // Don't fail the response if email alert fails
  }

  return { ok: false, rowsImported: 0, error: errorMessage };
}
