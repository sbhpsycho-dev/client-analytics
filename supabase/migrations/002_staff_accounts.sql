-- Staff accounts for setter/closer personal logins
CREATE TABLE public.staff_accounts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,          -- must match setter/closer name in their Google Sheet exactly
  email         text NOT NULL UNIQUE,
  role          text NOT NULL CHECK (role IN ('setter', 'closer')),
  password_hash text NOT NULL,
  sheet_id      text,                   -- individual Google Sheet ID for this rep
  sheet_tab     text DEFAULT 'Sheet1',  -- tab name within their sheet
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

-- Only service role client can access this table (API routes use createServiceClient)
CREATE POLICY "service_role_only" ON public.staff_accounts
  USING (false);
