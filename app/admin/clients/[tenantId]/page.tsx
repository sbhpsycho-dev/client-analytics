import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Clock, Users } from "lucide-react";
import { AdminInviteSection } from "@/components/admin/AdminInviteSection";
import { AdminTrackerSection } from "@/components/admin/AdminTrackerSection";
import { DataEntrySection } from "@/components/admin/DataEntrySection";
import { TenantConfigSection } from "@/components/admin/TenantConfigSection";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (!tenant) notFound();

  const { data: conn } = await supabase
    .from("sheet_connections" as any)
    .select("*")
    .eq("tenant_id", tenantId)
    .single() as any;

  const { data: recentLogs } = await supabase
    .from("sync_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(20);

  const { data: trackerEntries } = await (supabase as any)
    .from("team_kpis")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const service = createServiceClient();
  const { data: recentCalls } = await service
    .from("calls")
    .select("id, date, setter, closer, lead_name, status, outcome, cash_collected, contract_value")
    .eq("tenant_id", tenantId)
    .eq("excluded", false)
    .order("date", { ascending: false })
    .limit(50);

  const { data: recentLeads } = await service
    .from("leads")
    .select("id, date, lead_name, source, setter, status, notes")
    .eq("tenant_id", tenantId)
    .eq("excluded", false)
    .order("date", { ascending: false })
    .limit(50);

  const { data: memberships } = (await supabase
    .from("tenant_memberships")
    .select("*, user_profiles!user_id(full_name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })) as any;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: tenant.brand_color }}
          >
            {tenant.name[0]}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{tenant.name}</h1>
            <p className="text-sm text-zinc-500">/{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/clients/${tenant.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <ExternalLink className="h-3.5 w-3.5" />
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="data">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="data" className="data-[state=active]:bg-zinc-900 text-zinc-300">Data Entry</TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-zinc-900 text-zinc-300">Config</TabsTrigger>
          <TabsTrigger value="sheet" className="data-[state=active]:bg-zinc-900 text-zinc-300">Sheet</TabsTrigger>
          <TabsTrigger value="sync" className="data-[state=active]:bg-zinc-900 text-zinc-300">Sync Logs</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-zinc-900 text-zinc-300">Users</TabsTrigger>
          <TabsTrigger value="trackers" className="data-[state=active]:bg-zinc-900 text-zinc-300">Trackers</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4">
          <DataEntrySection
            tenantId={tenantId}
            initialCalls={(recentCalls ?? []) as any}
            initialLeads={(recentLeads ?? []) as any}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <TenantConfigSection
            tenantId={tenantId}
            initialName={tenant.name}
            initialBrandColor={tenant.brand_color}
            initialWelcomeMessage={tenant.welcome_message}
            initialMonthlyGoal={(tenant as any).monthly_goal ?? 10000}
            initialStatus={tenant.status}
          />
        </TabsContent>

        <TabsContent value="sheet" className="mt-4">
          <div className="space-y-3">
            {conn ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Sheet Connection</p>
                  <div className="flex items-center gap-2 text-xs">
                    {conn.last_sync_status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    {conn.last_sync_status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                    {conn.last_sync_status === "pending" && <Clock className="h-3.5 w-3.5 text-zinc-400" />}
                    {conn.last_sync_status === "running" && <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
                    <span className="text-zinc-400 capitalize">{conn.last_sync_status}</span>
                  </div>
                </div>
                {conn.sheet_url && (
                  <p className="text-xs text-zinc-400 font-mono truncate">{conn.sheet_url}</p>
                )}
                {conn.last_synced_at && (
                  <p className="text-xs text-zinc-500">Last synced: {new Date(conn.last_synced_at).toLocaleString()}</p>
                )}
                {conn.last_sync_error && (
                  <p className="text-xs text-red-400">{conn.last_sync_error}</p>
                )}
                <Link href={`/admin/clients/${tenantId}/sheet`}>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                    Manage Sheet Connection
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center space-y-3">
                <p className="text-sm text-zinc-400">No sheet connected yet</p>
                <Link href={`/admin/clients/${tenantId}/sheet`}>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                    Connect Sheet
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  {["Started", "Status", "Rows Processed", "Rows Imported", "Error"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(recentLogs ?? []).map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        log.status === "success" ? "border-0 bg-emerald-500/15 text-emerald-400" :
                        log.status === "error" ? "border-0 bg-red-500/15 text-red-400" :
                        "border-0 bg-zinc-700 text-zinc-300"
                      }>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 tabular-nums">{log.rows_processed}</td>
                    <td className="px-4 py-3 text-zinc-300 tabular-nums">{log.rows_imported}</td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">{log.error_message ?? "—"}</td>
                  </tr>
                ))}
                {!recentLogs?.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No sync history yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="space-y-4">
            {/* Invite form */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" />
                <p className="text-sm font-medium text-white">Invite User</p>
              </div>
              <AdminInviteSection tenantSlug={tenant.slug} />
              <p className="text-xs text-zinc-500">
                The rep&apos;s <strong className="text-zinc-400">full name</strong> in their profile must match the name in the Google Sheet exactly so RLS filters work correctly.
              </p>
            </div>

            {/* Members table */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    {["User", "Role", "Status", "Invited"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {((memberships ?? []) as any[]).map((m: any) => (
                    <tr key={m.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{m.user_profiles?.full_name ?? "—"}</p>
                        <p className="text-xs text-zinc-500 font-mono">{m.invite_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="border-0 bg-zinc-700 text-zinc-300 capitalize text-xs">
                          {m.role.replace("client_", "")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border-0 capitalize text-xs ${
                          m.invite_status === "accepted" ? "bg-emerald-500/15 text-emerald-400" :
                          m.invite_status === "revoked" ? "bg-red-500/15 text-red-400" :
                          "bg-amber-500/15 text-amber-400"
                        }`}>
                          {m.invite_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {!memberships?.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">No users yet — send an invite above</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trackers" className="mt-4">
          <AdminTrackerSection tenantId={tenantId} existing={trackerEntries ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
