"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Plus, Trash2, RefreshCw, LinkIcon, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "setter" | "closer";
  sheet_id: string | null;
  sheet_tab: string | null;
  active: boolean;
  created_at: string;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(17,27,46,0.95) 0%, rgba(11,19,34,0.98) 100%)",
  border: "1px solid rgba(180,210,240,0.08)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(180,210,240,0.05)",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#4a6a8a" }}>{title}</span>
      <div className="h-px flex-1" style={{ background: "rgba(180,210,240,0.07)" }} />
    </div>
  );
}

function RoleBadge({ role }: { role: "setter" | "closer" }) {
  const isSetter = role === "setter";
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: isSetter ? "rgba(29,158,117,0.15)" : "rgba(59,111,181,0.15)",
        border: `1px solid ${isSetter ? "rgba(29,158,117,0.3)" : "rgba(59,111,181,0.3)"}`,
        color: isSetter ? "#1D9E75" : "#3B6FB5",
      }}>
      {role}
    </span>
  );
}

// ── Add member form ───────────────────────────────────────────────────────────

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"setter" | "closer">("setter");
  const [password, setPassword] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetTab, setSheetTab] = useState("Sheet1");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName(""); setEmail(""); setRole("setter");
    setPassword(""); setSheetUrl(""); setSheetTab("Sheet1");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password, sheetUrl, sheetTab }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add member");
        return;
      }
      toast.success(`${name} added as ${role}`);
      reset();
      setOpen(false);
      onAdded();
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(180,210,240,0.12)",
    color: "#dce8f4",
  };

  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-5 py-4 text-sm font-semibold transition-all"
        style={{ color: "#a8bdd4" }}
      >
        <Plus className="h-4 w-4" style={{ color: "#4a7ab5" }} />
        Add Staff Member
        {open ? <ChevronUp className="h-4 w-4 ml-auto opacity-40" /> : <ChevronDown className="h-4 w-4 ml-auto opacity-40" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 border-t" style={{ borderColor: "rgba(180,210,240,0.08)" }}>
          <div className="pt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jordan Smith"
                required className="h-10 rounded-lg text-sm" style={inputStyle} />
              <p className="text-[10px]" style={{ color: "#3a5a7a" }}>Must match name in their Google Sheet exactly</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rep@example.com"
                required className="h-10 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as "setter" | "closer")}
                className="w-full h-10 rounded-lg px-3 text-sm"
                style={{ ...inputStyle, appearance: "none" }}>
                <option value="setter">Setter</option>
                <option value="closer">Closer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a strong password"
                required className="h-10 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Google Sheet URL <span style={{ color: "#3a5a7a" }}>(optional)</span></label>
              <Input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
                className="h-10 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#4a6a8a" }}>Sheet Tab Name</label>
              <Input value={sheetTab} onChange={e => setSheetTab(e.target.value)} placeholder="Sheet1"
                className="h-10 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="h-9 px-5 text-sm font-semibold rounded-lg"
              style={{
                background: "linear-gradient(135deg, #1e3a6e, #2a4f8a)",
                border: "1px solid rgba(180,210,240,0.18)",
                color: "#dce8f4",
              }}>
              {isPending ? "Adding..." : "Add Member"}
            </Button>
            <Button type="button" onClick={() => { reset(); setOpen(false); }}
              className="h-9 px-4 text-sm rounded-lg"
              style={{ background: "transparent", border: "1px solid rgba(180,210,240,0.1)", color: "#4a6a8a" }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Staff table ───────────────────────────────────────────────────────────────

function StaffTable({ members, onDelete, onResetPw }: {
  members: StaffMember[];
  onDelete: (id: string, name: string) => void;
  onResetPw: (id: string, name: string) => void;
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center" style={CARD}>
        <Users className="h-8 w-8 mx-auto mb-3 opacity-20" style={{ color: "#7a9ab8" }} />
        <p className="text-sm" style={{ color: "#4a6a8a" }}>No staff members yet. Add one above.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={CARD}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(8,15,28,0.85)", borderBottom: "1px solid rgba(180,210,240,0.08)" }}>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Name</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Email</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Role</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Sheet</th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Added</th>
            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#4a6a8a" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id}
              style={{ borderBottom: i < members.length - 1 ? "1px solid rgba(180,210,240,0.05)" : undefined }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(180,210,240,0.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{
                      background: m.role === "setter" ? "rgba(29,158,117,0.2)" : "rgba(59,111,181,0.2)",
                      border: `1px solid ${m.role === "setter" ? "rgba(29,158,117,0.35)" : "rgba(59,111,181,0.35)"}`,
                    }}>{m.name[0]}</div>
                  <span className="font-semibold" style={{ color: "#dce8f4" }}>{m.name}</span>
                </div>
              </td>
              <td className="px-4 py-4" style={{ color: "#7a9ab8" }}>{m.email}</td>
              <td className="px-4 py-4"><RoleBadge role={m.role} /></td>
              <td className="px-4 py-4">
                {m.sheet_id ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#4ade80" }}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    {m.sheet_tab ?? "Sheet1"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#4a6a8a" }}>
                    <XCircle className="h-3.5 w-3.5" />
                    Not linked
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-xs" style={{ color: "#4a6a8a" }}>
                {new Date(m.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => onResetPw(m.id, m.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ color: "#7a9ab8", border: "1px solid rgba(180,210,240,0.1)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,122,181,0.4)"; (e.currentTarget as HTMLElement).style.color = "#dce8f4"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(180,210,240,0.1)"; (e.currentTarget as HTMLElement).style.color = "#7a9ab8"; }}>
                    <RefreshCw className="h-3 w-3" />
                    Reset PW
                  </button>
                  <button onClick={() => onDelete(m.id, m.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Filter = "all" | "setter" | "closer";

export function StaffClient({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = initialStaff.filter(m => filter === "all" || m.role === filter);
  const setters = initialStaff.filter(m => m.role === "setter").length;
  const closers = initialStaff.filter(m => m.role === "closer").length;

  function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? They will no longer be able to log in.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Failed to remove");
        return;
      }
      toast.success(`${name} removed`);
      router.refresh();
    });
  }

  function handleResetPw(id: string, name: string) {
    const pw = prompt(`New password for ${name}:`);
    if (!pw || pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    startTransition(async () => {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Failed to reset password");
        return;
      }
      toast.success(`Password reset for ${name}`);
    });
  }

  const FILTER_ACTIVE: React.CSSProperties = {
    background: "rgba(74,122,181,0.2)",
    border: "1px solid rgba(74,122,181,0.45)",
    color: "#dce8f4",
  };
  const FILTER_INACTIVE: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(180,210,240,0.1)",
    color: "#4a6a8a",
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#dce8f4" }}>Staff Roster</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4a6a8a" }}>
            {initialStaff.length} members · {setters} setters · {closers} closers
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "setter", "closer"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={filter === f ? FILTER_ACTIVE : FILTER_INACTIVE}>
              {f === "all" ? `All (${initialStaff.length})` : f === "setter" ? `Setters (${setters})` : `Closers (${closers})`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Staff",  value: initialStaff.length },
          { label: "Setters",      value: setters },
          { label: "Closers",      value: closers },
          { label: "Sheets Linked", value: initialStaff.filter(m => m.sheet_id).length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={CARD}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "#5a7a9a" }}>{label}</p>
            <p className="text-3xl font-black" style={{ color: "#dce8f4" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="space-y-3">
        <SectionHeader title="Add member" />
        <AddMemberForm onAdded={() => router.refresh()} />
      </div>

      {/* Table */}
      <div className="space-y-3">
        <SectionHeader title={filter === "all" ? "All staff" : filter === "setter" ? "Setters" : "Closers"} />
        <StaffTable members={filtered} onDelete={handleDelete} onResetPw={handleResetPw} />
      </div>

      <div className="pb-2">
        <p className="text-xs text-center" style={{ color: "#2a3f52" }}>
          Leadwell Advisors Analytics Platform &nbsp;·&nbsp; A Stack N Scale managed client
        </p>
      </div>
    </div>
  );
}
