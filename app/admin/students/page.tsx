"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Search, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Lead {
  id: string;
  tenant_id: string;
  date: string | null;
  lead_name: string | null;
  source: string | null;
  setter: string | null;
  status: string | null;
  notes: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    new:       "bg-blue-500/15 text-blue-400",
    contacted: "bg-yellow-500/15 text-yellow-400",
    booked:    "bg-orange-500/15 text-orange-400",
    showed:    "bg-green-500/15 text-green-400",
    closed:    "bg-emerald-500/15 text-emerald-400",
    lost:      "bg-red-500/15 text-red-400",
  };
  const cls = map[status ?? ""] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

export default function ClientsLeadsPage() {
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [tenantId, setTenantId]       = useState("");
  const [tenants, setTenants]         = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setTenants(d);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async (id: string, isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads?tenant_id=${id}`);
      if (res.ok) {
        const { leads: data } = await res.json();
        setLeads(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filtered = leads.filter(l =>
    !search ||
    (l.lead_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (l.setter ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (l.source ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Clients / Leads
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {leads.length} total · {filtered.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <button
            onClick={() => load(tenantId, true)}
            disabled={refreshing || !tenantId}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={tenantId}
          onChange={e => { setTenantId(e.target.value); load(e.target.value); }}
          className="h-8 px-2.5 text-xs bg-muted border border-border rounded-lg text-foreground"
        >
          <option value="">Select client…</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="pl-8 h-8 text-xs w-48 bg-muted border-border"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : !tenantId ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-xs text-muted-foreground">
            Select a client above to view their leads.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-xs text-muted-foreground">
            {search ? "No leads match your search." : "No leads yet for this client."}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead className="bg-muted/50">
              <tr>
                {["Date", "Name", "Source", "Setter", "Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-muted-foreground">{l.date ?? "—"}</td>
                  <td className="px-3 py-2.5 font-medium">{l.lead_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{l.source ?? "—"}</td>
                  <td className="px-3 py-2.5">{l.setter ?? "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
