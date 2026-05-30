import type { TablesInsert } from "@/types/database";

type ColumnMapping = Record<string, Record<string, string>>;

// Convert column letter (A, B, AA, etc.) to 0-based index
function colToIndex(col: string): number {
  let n = 0;
  for (const c of col.toUpperCase()) {
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n - 1;
}

function getCell(row: string[], colLetter: string | undefined): string {
  if (!colLetter) return "";
  const idx = colToIndex(colLetter);
  return (row[idx] ?? "").trim();
}

function parseNumber(val: string): number | null {
  const cleaned = val.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseTimestamp(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseStatus(val: string): "booked" | "showed" | "no-show" | "rescheduled" | "canceled" | null {
  const v = val.toLowerCase().replace(/[\s_-]/g, "");
  if (["booked", "scheduled"].includes(v)) return "booked";
  if (["showed", "show", "completed"].includes(v)) return "showed";
  if (["noshow", "ns", "noshowed"].includes(v)) return "no-show";
  if (["rescheduled", "reschedule"].includes(v)) return "rescheduled";
  if (["canceled", "cancelled", "cancel"].includes(v)) return "canceled";
  return null;
}

function parseOutcome(val: string): "closed" | "follow-up" | "lost" | null {
  const v = val.toLowerCase().replace(/[\s_-]/g, "");
  if (["closed", "close", "won"].includes(v)) return "closed";
  if (["followup", "fu", "follow"].includes(v)) return "follow-up";
  if (["lost", "no", "notinterested"].includes(v)) return "lost";
  return null;
}

export function transformCallRow(
  tenantId: string,
  row: string[],
  rowIndex: number,
  fieldMap: Record<string, string>
): TablesInsert<"calls"> {
  return {
    tenant_id: tenantId,
    sheet_row_index: rowIndex,
    date: parseDate(getCell(row, fieldMap.date)),
    setter: getCell(row, fieldMap.setter) || null,
    closer: getCell(row, fieldMap.closer) || null,
    lead_name: getCell(row, fieldMap.lead_name) || null,
    call_booked_at: parseTimestamp(getCell(row, fieldMap.call_booked_at)),
    call_scheduled_at: parseTimestamp(getCell(row, fieldMap.call_scheduled_at)),
    status: parseStatus(getCell(row, fieldMap.status)),
    outcome: parseOutcome(getCell(row, fieldMap.outcome)),
    cash_collected: parseNumber(getCell(row, fieldMap.cash_collected)),
    contract_value: parseNumber(getCell(row, fieldMap.contract_value)),
    raw_data: row as unknown as any,
  };
}

export function transformLeadRow(
  tenantId: string,
  row: string[],
  rowIndex: number,
  fieldMap: Record<string, string>
): TablesInsert<"leads"> {
  return {
    tenant_id: tenantId,
    sheet_row_index: rowIndex,
    date: parseDate(getCell(row, fieldMap.date)),
    source: getCell(row, fieldMap.source) || null,
    lead_name: getCell(row, fieldMap.lead_name) || null,
    setter: getCell(row, fieldMap.setter) || null,
    status: getCell(row, fieldMap.status) || null,
    notes: getCell(row, fieldMap.notes) || null,
  };
}

export function transformTeamRow(
  tenantId: string,
  row: string[],
  fieldMap: Record<string, string>
): TablesInsert<"team_members"> {
  const roleRaw = getCell(row, fieldMap.role).toLowerCase();
  const role = (["setter", "closer", "manager"].includes(roleRaw)
    ? roleRaw
    : null) as "setter" | "closer" | "manager" | null;

  const activeRaw = getCell(row, fieldMap.active).toLowerCase();
  const active = !["false", "0", "no", "inactive"].includes(activeRaw);

  return {
    tenant_id: tenantId,
    name: getCell(row, fieldMap.name) || null,
    role,
    email: getCell(row, fieldMap.email) || null,
    active,
  };
}

export function shouldSkipRow(row: string[]): boolean {
  return row.every((cell) => !cell || cell.trim() === "");
}

export function transformRows(
  tenantId: string,
  rows: string[][],
  mapping: ColumnMapping
): {
  calls: TablesInsert<"calls">[];
  leads: TablesInsert<"leads">[];
  team: TablesInsert<"team_members">[];
} {
  const calls: TablesInsert<"calls">[] = [];
  const leads: TablesInsert<"leads">[] = [];
  const team: TablesInsert<"team_members">[] = [];

  // Rows are 1-indexed (skip header row at index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (shouldSkipRow(row)) continue;

    if (Object.keys(mapping.calls ?? {}).length > 0) {
      calls.push(transformCallRow(tenantId, row, i + 1, mapping.calls));
    }
    if (Object.keys(mapping.leads ?? {}).length > 0) {
      leads.push(transformLeadRow(tenantId, row, i + 1, mapping.leads));
    }
  }

  return { calls, leads, team };
}
