"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugEdited(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);

    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim(), brand_color: brandColor }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Failed to create client");
      return;
    }

    toast.success(`${name} created`);
    router.push(`/admin/clients/${data.tenant.id}`);
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">New Client</h1>
          <p className="text-sm text-zinc-400">Add a client company to the dashboard</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Company Name</Label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. LWA"
            required
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-300">URL Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">/clients/</span>
            <Input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="lwa"
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 flex-1"
            />
          </div>
          <p className="text-xs text-zinc-500">Lowercase letters, numbers, hyphens only</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-300">Brand Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-9 w-14 rounded-md border border-zinc-700 bg-zinc-800 cursor-pointer p-1"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#6366f1"
              className="bg-zinc-800 border-zinc-700 text-white font-mono w-32"
            />
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: brandColor }}
            >
              {name[0]?.toUpperCase() ?? "A"}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !name.trim() || !slug.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Client"}
        </Button>
      </form>
    </div>
  );
}
