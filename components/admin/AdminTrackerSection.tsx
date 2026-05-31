"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["Setter", "Closer", "Sales Director", "VA", "Manager"];

interface KPIRow {
  id: string;
  member_name: string;
  role: string;
  metric_name: string;
  value: number | null;
  value_label: string | null;
  period_label: string | null;
}

export function AdminTrackerSection({ tenantId, existing }: { tenantId: string; existing: KPIRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    member_name: "",
    role: "Setter",
    metric_name: "",
    value_label: "",
    period_label: "",
  });
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.member_name || !form.metric_name) {
      setError("Name and metric are required.");
      return;
    }
    const res = await fetch("/api/admin/team-kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, ...form }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
      return;
    }
    setForm({ member_name: "", role: "Setter", metric_name: "", value_label: "", period_label: "" });
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/team-kpis?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete entry");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-semibold text-white mb-4">Add Tracker Entry</p>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input
            placeholder="Member name"
            value={form.member_name}
            onChange={e => setForm(f => ({ ...f, member_name: e.target.value }))}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <Input
            placeholder="Metric name (e.g. Show Rate)"
            value={form.metric_name}
            onChange={e => setForm(f => ({ ...f, metric_name: e.target.value }))}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <Input
            placeholder="Value (e.g. 87%)"
            value={form.value_label}
            onChange={e => setForm(f => ({ ...f, value_label: e.target.value }))}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <Input
            placeholder="Period (e.g. Week of May 26)"
            value={form.period_label}
            onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <Button type="submit" disabled={isPending} className="bg-violet-600 hover:bg-violet-700 text-white">
            Add
          </Button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* Existing entries */}
      {existing.length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase">Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase">Metric</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase">Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase">Period</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {existing.map(row => (
                <tr key={row.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-white">{row.member_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.role}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.metric_name}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.value_label ?? row.value ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.period_label ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                      className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {existing.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-6">No tracker entries yet.</p>
      )}
    </div>
  );
}
