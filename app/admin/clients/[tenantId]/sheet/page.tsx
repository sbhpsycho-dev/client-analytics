"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColumnMapper } from "@/components/admin/ColumnMapper";
import { TemplateSelector } from "@/components/admin/TemplateSelector";
import { toast } from "sonner";
import { Link2, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SheetConnection {
  id: string;
  sheet_id: string;
  sheet_url: string | null;
  sheet_name: string | null;
  column_mapping: Record<string, Record<string, string>>;
  last_sync_status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}

interface Headers {
  calls: string[];
  leads: string[];
  team: string[];
  tabs: string[];
}

export default function SheetPage() {
  const { tenantId } = useParams() as { tenantId: string };
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";

  const [conn, setConn] = useState<SheetConnection | null>(null);
  const [headers, setHeaders] = useState<Headers | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, Record<string, string>>>({ calls: {}, leads: {}, team: {} });
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadHeaders = useCallback(async (connectionId: string) => {
    const res = await fetch(`/api/admin/sheets/${connectionId}/headers`);
    if (res.ok) setHeaders(await res.json());
  }, []);

  useEffect(() => {
    async function load() {
      const [connRes, templatesRes] = await Promise.all([
        fetch(`/api/admin/clients/${tenantId}/sheet`),
        fetch("/api/admin/mappings"),
      ]);
      if (connRes.ok) {
        const data = await connRes.json();
        setConn(data);
        setMapping(data.column_mapping ?? { calls: {}, leads: {}, team: {} });
        setSheetUrl(data.sheet_url ?? "");
        await loadHeaders(data.id);
      }
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      setLoading(false);
    }
    load();
    if (justConnected) toast.success("Google account connected!");
  }, [tenantId, justConnected, loadHeaders]);

  async function handleConnectGoogle() {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to start Google connection");
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Failed to start Google connection");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSetSheetUrl() {
    if (!conn || !sheetUrl.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/sheets/${conn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet_url: sheetUrl }),
    });
    if (res.ok) {
      const updated = await res.json();
      setConn(updated);
      await loadHeaders(conn.id);
      toast.success("Sheet URL saved — loading headers…");
    } else {
      toast.error("Invalid sheet URL");
    }
    setSaving(false);
  }

  async function handleSaveMapping() {
    if (!conn) return;
    setSaving(true);
    const res = await fetch(`/api/admin/sheets/${conn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_mapping: mapping }),
    });
    if (res.ok) {
      toast.success("Column mapping saved");
    } else {
      toast.error("Failed to save mapping");
    }
    setSaving(false);
  }

  async function handleSyncNow() {
    if (!conn) return;
    setSyncing(true);
    const res = await fetch(`/api/admin/sheets/${conn.id}/sync`, { method: "POST" });
    setSyncing(false);
    if (res.ok) {
      toast.success("Sync triggered");
    } else {
      toast.error("Sync failed — check logs");
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Sheet Connection</h2>
        <p className="text-sm text-zinc-400">Connect and map the client's Google Sheet</p>
      </div>

      {/* Step 1: Connect Google */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white">1. Connect Google Account</CardTitle>
            {conn && conn.sheet_id !== "PENDING" && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            )}
          </div>
          <CardDescription className="text-zinc-400">
            Authorize access to the agent Google account that was shared the client's sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnectGoogle}
            disabled={connecting}
            variant="outline"
            className="gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {conn ? "Reconnect Google Account" : "Connect Google Account"}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Sheet URL */}
      {conn && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white">2. Sheet URL</CardTitle>
            <CardDescription className="text-zinc-400">
              Paste the URL of the Google Sheet shared with you
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-zinc-800 border-zinc-700 text-white"
            />
            <Button
              onClick={handleSetSheetUrl}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load headers"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column mapping */}
      {headers && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-sm font-semibold text-white">3. Map Columns</CardTitle>
                <CardDescription className="text-zinc-400">
                  Match sheet columns to our standard fields
                </CardDescription>
              </div>
              <TemplateSelector
                templates={templates}
                currentMapping={mapping}
                onApply={setMapping}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ColumnMapper
              callsHeaders={headers.calls}
              leadsHeaders={headers.leads}
              teamHeaders={headers.team}
              initialMapping={mapping}
              onChange={setMapping}
            />
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSaveMapping}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save mapping"}
              </Button>
              <Button
                onClick={handleSyncNow}
                disabled={syncing}
                variant="outline"
                className="gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync status */}
      {conn?.last_sync_status === "error" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-900 bg-red-950/30 p-4">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Last sync failed</p>
            <p className="text-xs text-red-400 mt-0.5">{conn.last_sync_error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
