"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

// ── Color system ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  "VA":             "#8A5BC7",
  "Setter":         "#1D9E75",
  "Sales Director": "#3B6FB5",
  "Closer":         "#D8843A",
  "Manager":        "#D957A8",
};

const MEMBER_COLORS: Record<string, string> = {
  Chona:   "#8A5BC7",
  Harneet: "#3B6FB5",
  Sylis:   "#1D9E75",
  Izaiah:  "#D8843A",
  Celest:  "#D957A8",
};

function getMemberColor(name: string, role: string) {
  return MEMBER_COLORS[name] ?? ROLE_COLORS[role] ?? "#4a7ab5";
}

const SALES_KEYWORDS = ["cash", "revenue", "contract", "deal", "collected", "signed", "closed", "ticket"];

function isSalesMetric(name: string) {
  const lower = name.toLowerCase();
  return SALES_KEYWORDS.some(k => lower.includes(k));
}

const MEMBER_ORDER = ["Harneet", "Sylis", "Izaiah", "Celest", "Chona"];
const ROLES = ["Setter", "Closer", "Sales Director", "VA", "Manager"];

const PRESET_SALES: string[] = [
  "Cash Collected",
  "Contract Value",
  "Deals Closed",
  "Monthly Revenue",
];

const PRESET_PERF: string[] = [
  "Contact Rate",
  "Show Rate",
  "Conversion Rate",
  "Appointments Booked",
];

interface KPIRow {
  id: string;
  member_name: string;
  role: string;
  metric_name: string;
  value: number | null;
  value_label: string | null;
  period_label: string | null;
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "linear-gradient(160deg, #121e32 0%, #0e1929 50%, #0c1622 100%)",
  border: "1px solid rgba(180,210,240,0.10)",
  borderTop: "1px solid rgba(180,210,240,0.18)",
  boxShadow: "0 4px 30px rgba(0,0,0,0.4)",
};

const INPUT: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(180,210,240,0.12)",
  color: "#dce8f4",
  outline: "none",
  borderRadius: "10px",
  padding: "8px 12px",
  fontSize: "13px",
  width: "100%",
  transition: "border-color 0.15s",
};

// ── MetricRow ─────────────────────────────────────────────────────────────────

function MetricRow({
  row, color, isSales, deleting, onDelete,
}: {
  row: KPIRow;
  color: string;
  isSales: boolean;
  deleting: string | null;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 group"
      style={{
        background: hovered ? "rgba(180,210,240,0.02)" : "rgba(8,15,28,0.3)",
        borderTop: "1px solid rgba(180,210,240,0.04)",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Indent spacer */}
      <div className="w-4 shrink-0" />

      {/* Metric pill */}
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
        style={{
          background: `${color}14`,
          color: `${color}cc`,
          border: `1px solid ${color}25`,
        }}
      >
        {isSales && <span className="opacity-80">$</span>}
        {row.metric_name}
      </span>

      {/* Value */}
      <span
        className="ml-auto text-sm font-bold tabular-nums shrink-0"
        style={{ color: isSales ? "#fcd34d" : "#dce8f4" }}
      >
        {row.value_label ?? (row.value != null ? String(row.value) : "—")}
      </span>

      {/* Period badge */}
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
        style={{ background: "rgba(180,210,240,0.06)", color: "#4a6a8a" }}
      >
        {row.period_label ?? "—"}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(row.id)}
        disabled={deleting === row.id}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
        style={{ color: "#3a5a7a" }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#3a5a7a")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  const grouped = existing.reduce((acc, row) => {
    (acc[row.member_name] ??= []).push(row);
    return acc;
  }, {} as Record<string, KPIRow[]>);

  const sortedMembers = Object.keys(grouped).sort((a, b) => {
    const ai = MEMBER_ORDER.indexOf(a);
    const bi = MEMBER_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.member_name || !form.metric_name) {
      setError("Member name and metric are required.");
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
      if (!res.ok) { toast.error("Failed to delete"); return; }
      startTransition(() => router.refresh());
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">

      {/* ── Add form ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-5" style={CARD}>

        {/* Section label */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>
            Add Tracker Entry
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
        </div>

        {/* Quick-add presets */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#2a3f52" }}>Quick-add</p>

          {/* Sales */}
          <div className="flex flex-wrap gap-2">
            {PRESET_SALES.map(m => {
              const active = form.metric_name === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, metric_name: m }))}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{
                    background: active ? "rgba(252,211,77,0.15)" : "rgba(252,211,77,0.05)",
                    border: `1px solid ${active ? "rgba(252,211,77,0.4)" : "rgba(252,211,77,0.12)"}`,
                    color: active ? "#fcd34d" : "#8a7a40",
                  }}
                >
                  $ {m}
                </button>
              );
            })}
          </div>

          {/* Performance */}
          <div className="flex flex-wrap gap-2">
            {PRESET_PERF.map(m => {
              const active = form.metric_name === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, metric_name: m }))}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{
                    background: active ? "rgba(74,122,181,0.2)" : "rgba(74,122,181,0.06)",
                    border: `1px solid ${active ? "rgba(74,122,181,0.45)" : "rgba(74,122,181,0.14)"}`,
                    color: active ? "#a8c0d6" : "#4a6a8a",
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form grid */}
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input
            placeholder="Member name"
            value={form.member_name}
            onChange={e => setForm(f => ({ ...f, member_name: e.target.value }))}
            style={INPUT}
          />
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            style={{ ...INPUT, cursor: "pointer" }}
          >
            {ROLES.map(r => (
              <option key={r} value={r} style={{ background: "#0d1828", color: "#dce8f4" }}>{r}</option>
            ))}
          </select>
          <input
            placeholder="Metric (or pick above)"
            value={form.metric_name}
            onChange={e => setForm(f => ({ ...f, metric_name: e.target.value }))}
            style={INPUT}
          />
          <input
            placeholder="Value (e.g. $12,500 or 87%)"
            value={form.value_label}
            onChange={e => setForm(f => ({ ...f, value_label: e.target.value }))}
            style={INPUT}
          />
          <input
            placeholder="Period (e.g. Week of May 26)"
            value={form.period_label}
            onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))}
            style={INPUT}
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #1e3a6e 0%, #2a4f8a 50%, #1e3f7a 100%)",
              border: "1px solid rgba(180,210,240,0.18)",
              boxShadow: "0 4px 20px rgba(26,50,110,0.4)",
            }}
          >
            {isPending ? "Saving…" : "Add Entry"}
          </button>
        </form>

        {error && (
          <p className="text-xs font-medium" style={{ color: "#f87171" }}>{error}</p>
        )}
      </div>

      {/* ── Existing entries ─────────────────────────────────────────────────── */}
      {existing.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(180,210,240,0.08)" }}
        >
          {/* Table header */}
          <div
            className="flex items-center px-4 py-2.5 gap-4"
            style={{ background: "rgba(8,15,28,0.85)", borderBottom: "1px solid rgba(180,210,240,0.08)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] flex-1" style={{ color: "#4a6a8a" }}>
              Member · Metric
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Value</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] w-24 text-center" style={{ color: "#4a6a8a" }}>Period</span>
            <span className="w-4" />
          </div>

          {/* Grouped member sections */}
          {sortedMembers.map((memberName, mi) => {
            const rows = grouped[memberName];
            const role = rows[0]?.role ?? "";
            const color = getMemberColor(memberName, role);
            const salesRows = rows.filter(r => isSalesMetric(r.metric_name));
            const perfRows  = rows.filter(r => !isSalesMetric(r.metric_name));

            return (
              <div
                key={memberName}
                style={{ borderTop: mi > 0 ? "1px solid rgba(180,210,240,0.07)" : undefined }}
              >
                {/* Member header */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: `linear-gradient(90deg, ${color}10 0%, rgba(8,15,28,0.5) 100%)`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: `${color}25`, border: `1px solid ${color}45` }}
                  >
                    {memberName[0]}
                  </div>

                  <span className="font-bold text-sm" style={{ color: "#dce8f4" }}>{memberName}</span>

                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}
                  >
                    {role}
                  </span>

                  {/* Sales total badge */}
                  {salesRows.length > 0 && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(252,211,77,0.1)", color: "#fcd34d", border: "1px solid rgba(252,211,77,0.2)" }}
                    >
                      {salesRows.length} sales metric{salesRows.length !== 1 ? "s" : ""}
                    </span>
                  )}

                  <span
                    className="ml-auto text-[10px] font-semibold rounded-md px-2 py-0.5"
                    style={{ background: "rgba(180,210,240,0.06)", color: "#4a6a8a" }}
                  >
                    {rows.length} total
                  </span>
                </div>

                {/* Sales metrics (gold) */}
                {salesRows.map(row => (
                  <MetricRow
                    key={row.id}
                    row={row}
                    color="#fcd34d"
                    isSales
                    deleting={deleting}
                    onDelete={handleDelete}
                  />
                ))}

                {/* Performance metrics */}
                {perfRows.map(row => (
                  <MetricRow
                    key={row.id}
                    row={row}
                    color={color}
                    isSales={false}
                    deleting={deleting}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl px-6 py-12 text-center"
          style={{ background: "rgba(8,15,28,0.4)", border: "1px solid rgba(180,210,240,0.06)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#3a5a7a" }}>No tracker entries yet</p>
          <p className="text-xs mt-1" style={{ color: "#2a3f52" }}>
            Use the form above to add KPIs or high-ticket sales numbers
          </p>
        </div>
      )}
    </div>
  );
}
