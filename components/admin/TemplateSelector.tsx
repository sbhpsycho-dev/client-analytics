"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bookmark, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string | null;
  mapping: Record<string, Record<string, string>>;
}

interface TemplateSelectorProps {
  templates: Template[];
  currentMapping: Record<string, Record<string, string>>;
  onApply: (mapping: Record<string, Record<string, string>>) => void;
}

export function TemplateSelector({ templates, currentMapping, onApply }: TemplateSelectorProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, mapping: currentMapping }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Template saved");
      setSaveOpen(false);
      setName("");
      setDescription("");
    } else {
      toast.error("Failed to save template");
    }
  }

  function handleApply(templateId: string | null) {
    if (!templateId) return;
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      onApply(t.mapping as Record<string, Record<string, string>>);
      toast.success(`Applied template: ${t.name}`);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Apply template */}
      {templates.length > 0 && (
        <Select onValueChange={handleApply}>
          <SelectTrigger className="w-52 bg-zinc-800 border-zinc-700 text-zinc-200 h-9">
            <Bookmark className="h-3.5 w-3.5 mr-2 text-zinc-400" />
            <SelectValue placeholder="Apply template" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-zinc-200">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Save as template */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSaveOpen(true)}
        className="h-9 gap-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Save as template
      </Button>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Save mapping as template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Template name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Go High Level Sheet"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="When to use this template"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
