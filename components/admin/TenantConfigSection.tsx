"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const INPUT = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500";
const SELECT = `${INPUT} cursor-pointer`;
const LABEL = "block text-xs font-medium text-zinc-400 mb-1";

interface Props {
  tenantId: string;
  initialName: string;
  initialBrandColor: string;
  initialWelcomeMessage: string | null;
  initialMonthlyGoal: number | null;
  initialStatus: string;
}

export function TenantConfigSection({
  tenantId,
  initialName,
  initialBrandColor,
  initialWelcomeMessage,
  initialMonthlyGoal,
  initialStatus,
}: Props) {
  const [form, setForm] = useState({
    name: initialName,
    brand_color: initialBrandColor,
    welcome_message: initialWelcomeMessage ?? "",
    monthly_goal: String(initialMonthlyGoal ?? 10000),
    status: initialStatus,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monthly_goal: Number(form.monthly_goal) || 10000,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error || "Failed to save", ok: false });
      } else {
        setMsg({ text: "Changes saved", ok: true });
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
      <p className="text-sm font-semibold text-white">Client Configuration</p>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Client Name</label>
          <input className={INPUT} value={form.name} onChange={set("name")} />
        </div>

        <div>
          <label className={LABEL}>Monthly Revenue Goal ($)</label>
          <input type="number" className={INPUT} min="0" value={form.monthly_goal} onChange={set("monthly_goal")} />
        </div>

        <div>
          <label className={LABEL}>Status</label>
          <select className={SELECT} value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>Brand Color</label>
          <div className="flex gap-2">
            <input type="color" value={form.brand_color}
              onChange={set("brand_color")}
              className="h-[38px] w-12 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 p-1" />
            <input className={`${INPUT} font-mono`} value={form.brand_color} onChange={set("brand_color")} maxLength={7} />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>Welcome Message</label>
          <input className={INPUT} placeholder="e.g. Welcome back, Team!" value={form.welcome_message}
            onChange={set("welcome_message")} />
          <p className="mt-1 text-xs text-zinc-500">Shown at the top of the client dashboard.</p>
        </div>
      </div>

      {/* Live brand preview */}
      <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: form.brand_color }}>
          {form.name[0] ?? "?"}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{form.name || "Client Name"}</p>
          <p className="text-xs text-zinc-500">{form.welcome_message || "Welcome message preview"}</p>
        </div>
        <div className="ml-auto text-xs text-zinc-500 font-mono">{form.brand_color}</div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
