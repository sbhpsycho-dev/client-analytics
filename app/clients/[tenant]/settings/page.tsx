"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { tenant } = useParams() as { tenant: string };
  const [name, setName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/tenant/${tenant}/profile`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then((d) => {
        setName(d.name ?? "");
        setWelcomeMessage(d.welcome_message ?? "");
        setBrandColor(d.brand_color ?? "#6366f1");
      })
      .catch(() => toast.error("Failed to load settings"));
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/tenant/${tenant}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, welcome_message: welcomeMessage, brand_color: brandColor }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-zinc-400">Manage your company profile and branding</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base text-white">Company Profile</CardTitle>
          <CardDescription className="text-zinc-400">
            This information appears throughout your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Company Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Welcome Message</Label>
              <Input
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Welcome back, Team!"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border border-zinc-700 bg-transparent"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#6366f1"
                  className="w-36 bg-zinc-800 border-zinc-700 text-white font-mono"
                />
                <div
                  className="h-10 w-20 rounded-lg border border-zinc-700"
                  style={{ backgroundColor: brandColor }}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white mt-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
