ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS monthly_goal numeric(12,2) NOT NULL DEFAULT 10000;
