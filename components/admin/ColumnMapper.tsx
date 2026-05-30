"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Our standardized field definitions per table
const CALLS_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "setter", label: "Setter", required: false },
  { key: "closer", label: "Closer", required: false },
  { key: "lead_name", label: "Lead Name", required: false },
  { key: "call_booked_at", label: "Call Booked At", required: false },
  { key: "call_scheduled_at", label: "Call Scheduled At", required: false },
  { key: "status", label: "Status (booked/showed/no-show/…)", required: false },
  { key: "outcome", label: "Outcome (closed/follow-up/lost)", required: false },
  { key: "cash_collected", label: "Cash Collected", required: false },
  { key: "contract_value", label: "Contract Value", required: false },
];

const LEADS_FIELDS = [
  { key: "date", label: "Date", required: false },
  { key: "source", label: "Source", required: false },
  { key: "lead_name", label: "Lead Name", required: false },
  { key: "setter", label: "Setter", required: false },
  { key: "status", label: "Status", required: false },
  { key: "notes", label: "Notes", required: false },
];

const TEAM_FIELDS = [
  { key: "name", label: "Name", required: false },
  { key: "role", label: "Role (setter/closer/manager)", required: false },
  { key: "email", label: "Email", required: false },
  { key: "active", label: "Active (true/false)", required: false },
];

const NONE = "__none__";

interface ColumnMapperProps {
  callsHeaders: string[];
  leadsHeaders: string[];
  teamHeaders: string[];
  initialMapping?: Record<string, Record<string, string>>;
  onChange: (mapping: Record<string, Record<string, string>>) => void;
}

function FieldRow({
  field,
  headers,
  value,
  onChange,
}: {
  field: { key: string; label: string; required: boolean };
  headers: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Label className="w-48 text-sm text-zinc-300 shrink-0">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <Select value={value || NONE} onValueChange={(v) => v !== null && onChange(v === NONE ? "" : v)}>
        <SelectTrigger className="w-56 bg-zinc-800 border-zinc-700 text-zinc-200">
          <SelectValue placeholder="— not mapped —" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value={NONE} className="text-zinc-400">— not mapped —</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h} className="text-zinc-200">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ColumnMapper({
  callsHeaders,
  leadsHeaders,
  teamHeaders,
  initialMapping,
  onChange,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, Record<string, string>>>(
    initialMapping ?? { calls: {}, leads: {}, team: {} }
  );

  function update(table: string, field: string, value: string) {
    const next = { ...mapping, [table]: { ...mapping[table], [field]: value } };
    setMapping(next);
    onChange(next);
  }

  return (
    <div className="space-y-8">
      {/* Calls */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Calls Tab</h3>
          <p className="text-xs text-zinc-500">Map your sheet columns to each call field</p>
        </div>
        <div className="space-y-2.5">
          {CALLS_FIELDS.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              headers={callsHeaders}
              value={mapping.calls?.[f.key] ?? ""}
              onChange={(v) => update("calls", f.key, v)}
            />
          ))}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Leads */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Leads Tab</h3>
          <p className="text-xs text-zinc-500">Optional — skip if leads are in the same tab as calls</p>
        </div>
        <div className="space-y-2.5">
          {LEADS_FIELDS.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              headers={leadsHeaders}
              value={mapping.leads?.[f.key] ?? ""}
              onChange={(v) => update("leads", f.key, v)}
            />
          ))}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Team */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Team Tab</h3>
          <p className="text-xs text-zinc-500">Optional — maps the team roster</p>
        </div>
        <div className="space-y-2.5">
          {TEAM_FIELDS.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              headers={teamHeaders}
              value={mapping.team?.[f.key] ?? ""}
              onChange={(v) => update("team", f.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
