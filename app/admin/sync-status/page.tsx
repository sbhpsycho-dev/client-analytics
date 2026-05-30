import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, RefreshCw, Clock } from "lucide-react";

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-red-400" />;
  if (status === "running") return <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" />;
  return <Clock className="h-4 w-4 text-zinc-500" />;
}

export default async function SyncStatusPage() {
  const supabase = await createClient();

  const { data } = (await supabase
    .from("tenants")
    .select("id, name, slug, status, sheet_connections(last_sync_status, last_synced_at, last_sync_error, sync_enabled)")
    .order("name", { ascending: true })) as any;

  const tenants = data ?? [];

  const healthy = tenants.filter((t: any) => t.sheet_connections?.[0]?.last_sync_status === "success").length;
  const errored = tenants.filter((t: any) => t.sheet_connections?.[0]?.last_sync_status === "error").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Sync Status</h1>
        <p className="text-sm text-zinc-400">
          {healthy} healthy · {errored} error{errored !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{healthy}</p>
          <p className="text-xs text-zinc-400 mt-1">Synced</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{errored}</p>
          <p className="text-xs text-zinc-400 mt-1">Errors</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="text-2xl font-bold text-white">{tenants.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Total</p>
        </div>
      </div>

      {/* Per-client table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              {["Client", "Sync Status", "Last Synced", "Error"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tenants.map((t: any) => {
              const conn = t.sheet_connections?.[0];
              return (
                <tr key={t.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">/{t.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={conn?.last_sync_status ?? "pending"} />
                      <span className="text-sm text-zinc-300 capitalize">{conn?.last_sync_status ?? "pending"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {conn?.last_synced_at
                      ? new Date(conn.last_synced_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">
                    {conn?.last_sync_error ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
