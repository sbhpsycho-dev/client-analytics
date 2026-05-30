import { createClient } from "@/lib/supabase/server";

export default async function LogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*, actor:user_profiles!actor_id(full_name), tenant:tenants!tenant_id(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Audit Logs</h1>
        <p className="text-sm text-zinc-400">Last 100 events</p>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              {["Time", "Actor", "Action", "Entity", "Client"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(logs ?? []).map((l) => (
              <tr key={l.id} className="hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {(l.actor as any)?.full_name ?? "System"}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-zinc-800 text-violet-300 rounded px-1.5 py-0.5">{l.action}</code>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">
                  {l.entity_type ?? "—"}{l.entity_id ? `:${l.entity_id.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {(l.tenant as any)?.name ?? "—"}
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No logs yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
