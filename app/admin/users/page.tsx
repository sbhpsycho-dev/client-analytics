import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

const ROLE_COLORS: Record<string, string> = {
  agency_admin: "bg-violet-500/15 text-violet-400",
  agency_agent: "bg-blue-500/15 text-blue-400",
  client: "bg-zinc-700 text-zinc-300",
};

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: profiles } = (await supabase
    .from("user_profiles")
    .select("*, tenant_memberships(role, tenants(name))")
    .order("created_at", { ascending: false })) as any;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="text-sm text-zinc-400">{profiles?.length ?? 0} total users</p>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              {["User", "System Role", "Tenant(s)", "Joined"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {((profiles ?? []) as any[]).map((p: any) => {
              const memberships = (p.tenant_memberships ?? []) as any[];
              return (
                <tr key={p.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.full_name ?? "—"}</p>
                    <p className="text-xs text-zinc-500 font-mono">{p.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`border-0 capitalize ${ROLE_COLORS[p.system_role] ?? "bg-zinc-700 text-zinc-300"}`}>
                      {p.system_role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {memberships.length > 0
                      ? memberships.map((m: any) => m.tenants?.name).filter(Boolean).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {!profiles?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">No users yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
