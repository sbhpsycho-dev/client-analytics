"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2 } from "lucide-react";

const INPUT = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500";
const SELECT = `${INPUT} cursor-pointer`;
const LABEL = "block text-xs font-medium text-zinc-400 mb-1";

interface Call {
  id: string;
  date: string;
  setter: string | null;
  closer: string | null;
  lead_name: string | null;
  status: string | null;
  outcome: string | null;
  cash_collected: number | null;
  contract_value: number | null;
}

interface Lead {
  id: string;
  date: string;
  lead_name: string | null;
  source: string | null;
  setter: string | null;
  status: string | null;
  notes: string | null;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function DataEntrySection({ tenantId, initialCalls, initialLeads }: {
  tenantId: string;
  initialCalls: Call[];
  initialLeads: Lead[];
}) {
  const [calls, setCalls] = useState<Call[]>(initialCalls);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [tab, setTab] = useState<"calls" | "leads">("calls");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [callForm, setCallForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    setter: "", closer: "", lead_name: "",
    status: "booked", outcome: "", cash_collected: "", contract_value: "",
  });

  const [leadForm, setLeadForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    lead_name: "", source: "", setter: "", status: "new", notes: "",
  });

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const addCall = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, ...callForm,
          outcome: callForm.outcome || null,
          cash_collected: callForm.cash_collected ? Number(callForm.cash_collected) : null,
          contract_value: callForm.contract_value ? Number(callForm.contract_value) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || "Error adding call", false); return; }
      setCalls((prev) => [data.call, ...prev]);
      setCallForm((f) => ({ ...f, setter: "", closer: "", lead_name: "", outcome: "", cash_collected: "", contract_value: "" }));
      flash("Call added", true);
    } finally { setSaving(false); }
  }, [tenantId, callForm]);

  const addLead = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, ...leadForm }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || "Error adding lead", false); return; }
      setLeads((prev) => [data.lead, ...prev]);
      setLeadForm((f) => ({ ...f, lead_name: "", source: "", setter: "", notes: "" }));
      flash("Lead added", true);
    } finally { setSaving(false); }
  }, [tenantId, leadForm]);

  const deleteCall = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/calls/${id}`, { method: "DELETE" });
      if (!res.ok) { flash("Error deleting call", false); return; }
      setCalls((prev) => prev.filter((c) => c.id !== id));
    } finally { setDeleting(null); }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
      if (!res.ok) { flash("Error deleting lead", false); return; }
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } finally { setDeleting(null); }
  }, []);

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-800 p-1 w-fit">
        {(["calls", "leads"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors
              ${tab === t ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "calls" && (
        <>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Add Call</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className={LABEL}>Date *</label>
                <input type="date" className={INPUT} value={callForm.date}
                  onChange={(e) => setCallForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Setter</label>
                <input className={INPUT} placeholder="Name" value={callForm.setter}
                  onChange={(e) => setCallForm((f) => ({ ...f, setter: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Closer</label>
                <input className={INPUT} placeholder="Name" value={callForm.closer}
                  onChange={(e) => setCallForm((f) => ({ ...f, closer: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Lead Name</label>
                <input className={INPUT} placeholder="Optional" value={callForm.lead_name}
                  onChange={(e) => setCallForm((f) => ({ ...f, lead_name: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Status *</label>
                <select className={SELECT} value={callForm.status}
                  onChange={(e) => setCallForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="booked">Booked</option>
                  <option value="showed">Showed</option>
                  <option value="no-show">No-Show</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Outcome</label>
                <select className={SELECT} value={callForm.outcome}
                  onChange={(e) => setCallForm((f) => ({ ...f, outcome: e.target.value }))}>
                  <option value="">— None —</option>
                  <option value="closed">Closed</option>
                  <option value="follow-up">Follow-Up</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Cash Collected</label>
                <input type="number" className={INPUT} placeholder="0" min="0" value={callForm.cash_collected}
                  onChange={(e) => setCallForm((f) => ({ ...f, cash_collected: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Contract Value</label>
                <input type="number" className={INPUT} placeholder="0" min="0" value={callForm.contract_value}
                  onChange={(e) => setCallForm((f) => ({ ...f, contract_value: e.target.value }))} />
              </div>
            </div>
            <Button onClick={addCall} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Call
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  {["Date", "Setter", "Closer", "Status", "Outcome", "Cash", "CV", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {calls.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-2.5 text-zinc-300 text-xs whitespace-nowrap">{c.date}</td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{c.setter ?? "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{c.closer ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`border-0 capitalize text-xs
                        ${c.status === "showed" ? "bg-emerald-500/15 text-emerald-400" :
                          c.status === "no-show" ? "bg-red-500/15 text-red-400" :
                          c.status === "rescheduled" ? "bg-amber-500/15 text-amber-400" :
                          "bg-zinc-700 text-zinc-300"}`}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs capitalize">{c.outcome ?? "—"}</td>
                    <td className="px-3 py-2.5 text-emerald-400 text-xs tabular-nums">{fmt(c.cash_collected)}</td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs tabular-nums">{fmt(c.contract_value)}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => deleteCall(c.id)} disabled={deleting === c.id}
                        className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50">
                        {deleting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {!calls.length && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-500">No calls yet — add one above</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "leads" && (
        <>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Add Lead</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL}>Date *</label>
                <input type="date" className={INPUT} value={leadForm.date}
                  onChange={(e) => setLeadForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Lead Name</label>
                <input className={INPUT} placeholder="Name" value={leadForm.lead_name}
                  onChange={(e) => setLeadForm((f) => ({ ...f, lead_name: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Source</label>
                <input className={INPUT} placeholder="e.g. Referral, YouTube" value={leadForm.source}
                  onChange={(e) => setLeadForm((f) => ({ ...f, source: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Setter</label>
                <input className={INPUT} placeholder="Name" value={leadForm.setter}
                  onChange={(e) => setLeadForm((f) => ({ ...f, setter: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select className={SELECT} value={leadForm.status}
                  onChange={(e) => setLeadForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="booked">Booked</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Notes</label>
                <input className={INPUT} placeholder="Optional" value={leadForm.notes}
                  onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <Button onClick={addLead} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Lead
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  {["Date", "Lead", "Source", "Setter", "Status", "Notes", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-2.5 text-zinc-300 text-xs whitespace-nowrap">{l.date}</td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{l.lead_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400 text-xs">{l.source ?? "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{l.setter ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge className="border-0 capitalize text-xs bg-zinc-700 text-zinc-300">{l.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-[200px] truncate">{l.notes ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => deleteLead(l.id)} disabled={deleting === l.id}
                        className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50">
                        {deleting === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No leads yet — add one above</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
