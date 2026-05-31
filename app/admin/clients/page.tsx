import Link from "next/link";
import { getAllTenants } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Building2,
} from "lucide-react";

function SyncStatusBadge({ status }: { status: string | null }) {
  if (status === "success")
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Synced
      </span>
    );
  if (status === "error")
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="h-3.5 w-3.5" /> Error
      </span>
    );
  if (status === "running")
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-400">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <Clock className="h-3.5 w-3.5" /> Pending
    </span>
  );
}

export default async function AdminPage() {
  const tenants = await getAllTenants() as any[];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Clients</h1>
          <p className="text-sm text-zinc-400">{tenants.length} client{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/admin/clients/new">
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Table */}
      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add your first client to start managing their analytics dashboard."
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Sync</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Last Synced</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Agent</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {tenants.map((tenant) => {
                const conn = tenant.sheet_connections?.[0];
                const lastSync = conn?.last_synced_at
                  ? new Date(conn.last_synced_at).toLocaleString()
                  : "Never";

                return (
                  <tr key={tenant.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: tenant.brand_color }}
                        >
                          {tenant.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-zinc-500">/{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={tenant.status === "active" ? "default" : "secondary"}
                        className={
                          tenant.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border-0"
                            : "bg-zinc-700 text-zinc-300 border-0"
                        }
                      >
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <SyncStatusBadge status={conn?.last_sync_status ?? null} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">{lastSync}</td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      {"—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        {/* View client dashboard */}
                        <Link href={`/clients/${tenant.slug}`} target="_blank">
                          <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Dashboard
                          </Button>
                        </Link>
                        <Link href={`/admin/clients/${tenant.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
