-- Allow manually entered calls/leads (no sheet row index)
ALTER TABLE public.calls ALTER COLUMN sheet_row_index DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN sheet_row_index DROP NOT NULL;

-- Drop the old unique constraints (which required non-null)
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_tenant_id_sheet_row_index_key;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_tenant_id_sheet_row_index_key;

-- Partial unique indexes: only enforce uniqueness when sheet_row_index is present
CREATE UNIQUE INDEX IF NOT EXISTS calls_tenant_sheet_row_unique
  ON public.calls(tenant_id, sheet_row_index)
  WHERE sheet_row_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_tenant_sheet_row_unique
  ON public.leads(tenant_id, sheet_row_index)
  WHERE sheet_row_index IS NOT NULL;
