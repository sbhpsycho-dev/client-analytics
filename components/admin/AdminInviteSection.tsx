"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

const ROLES = [
  { value: "client_owner", label: "Owner" },
  { value: "client_manager", label: "Manager" },
  { value: "client_setter", label: "Setter" },
  { value: "client_closer", label: "Closer" },
];

interface Props {
  tenantSlug: string;
}

export function AdminInviteSection({ tenantSlug }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client_setter");
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const res = await fetch("/api/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug, email: email.trim(), role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Failed to send invite");
      return;
    }

    toast.success(`Invite sent to ${email}`);
    setEmail("");
  }

  return (
    <form onSubmit={handleSend} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label className="text-zinc-400 text-xs">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rep@company.com"
          required
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Role</Label>
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200 h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-zinc-200">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        disabled={loading || !email.trim()}
        size="sm"
        className="h-9 bg-violet-600 hover:bg-violet-700 text-white gap-2"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Send Invite
      </Button>
    </form>
  );
}
