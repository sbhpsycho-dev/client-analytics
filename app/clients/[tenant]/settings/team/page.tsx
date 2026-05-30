"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

const ROLES = ["client_owner", "client_manager", "client_setter", "client_closer"];
const ROLE_LABELS: Record<string, string> = {
  client_owner: "Owner",
  client_manager: "Manager",
  client_setter: "Setter",
  client_closer: "Closer",
};

export default function TeamSettingsPage() {
  const { tenant } = useParams() as { tenant: string };
  const [members, setMembers] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("client_setter");
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/tenant/${tenant}/members`);
    if (res.ok) setMembers(await res.json());
    else toast.error("Failed to load team members");
  }, [tenant]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch("/api/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug: tenant, email: inviteEmail, role: inviteRole }),
    });
    setInviting(false);
    if (res.ok) {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
    } else {
      toast.error("Failed to send invite");
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Team</h1>
          <p className="text-sm text-zinc-400">Manage access to your dashboard</p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Invite
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No team members"
          description="Invite your team to give them access to the dashboard."
          action={{ label: "Invite member", onClick: () => setInviteOpen(true) }}
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {["Member", "Role", "Status", ""].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{m.user_profiles?.full_name ?? m.invite_email ?? "—"}</p>
                    {m.invite_email && <p className="text-xs text-zinc-500">{m.invite_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="border-0 bg-violet-500/15 text-violet-400 capitalize">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={m.invite_status === "accepted" ? "border-0 bg-emerald-500/15 text-emerald-400" : "border-0 bg-amber-500/15 text-amber-400"}>
                      {m.invite_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.invite_status !== "accepted" && (
                      <span className="text-xs text-zinc-500">Invite pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="teammate@company.com"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-zinc-200">
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={inviting}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
