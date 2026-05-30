-- ============================================================
-- Client Analytics Dashboard — Initial Schema + RLS
-- ============================================================
-- Run this in the Supabase SQL editor for the analytics project.
-- This is a SEPARATE Supabase project from the SNS internal dashboard.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── user_profiles ───────────────────────────────────────────────────────────
-- Extends auth.users with app-level fields.
-- system_role controls which app section a user can access.
CREATE TABLE public.user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  avatar_url  text,
  system_role text NOT NULL DEFAULT 'client'
              CHECK (system_role IN ('agency_admin', 'agency_agent', 'client')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── tenants ─────────────────────────────────────────────────────────────────
-- One row per client company.
CREATE TABLE public.tenants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE NOT NULL,
  name                text NOT NULL,
  logo_url            text,
  brand_color         text NOT NULL DEFAULT '#6366f1',
  default_theme       text NOT NULL DEFAULT 'dark'
                      CHECK (default_theme IN ('light', 'dark')),
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'suspended', 'inactive')),
  assigned_agent_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  welcome_message     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── tenant_memberships ───────────────────────────────────────────────────────
CREATE TABLE public.tenant_memberships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role          text NOT NULL
                CHECK (role IN ('client_owner', 'client_manager', 'client_setter', 'client_closer')),
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token  text UNIQUE,
  invite_email  text,
  invite_status text NOT NULL DEFAULT 'pending'
                CHECK (invite_status IN ('pending', 'accepted', 'revoked')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz
);

CREATE INDEX idx_tenant_memberships_tenant_id ON public.tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_user_id   ON public.tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_token     ON public.tenant_memberships(invite_token);

-- ─── mapping_templates ───────────────────────────────────────────────────────
-- Reusable column-mapping presets agents can apply to new clients.
CREATE TABLE public.mapping_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mapping     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── sheet_connections ───────────────────────────────────────────────────────
-- Agent-managed Google Sheet connection per tenant.
-- OAuth tokens are AES-256-GCM encrypted before storage (app-layer encryption).
CREATE TABLE public.sheet_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sheet_id              text NOT NULL,
  sheet_name            text,
  sheet_url             text,
  tab_calls             text NOT NULL DEFAULT 'Sheet1',
  tab_leads             text NOT NULL DEFAULT 'Sheet1',
  tab_team              text NOT NULL DEFAULT 'Sheet1',
  -- column_mapping JSON shape:
  -- { "calls": { "date": "A", "setter": "B", ... },
  --   "leads": { "date": "A", "source": "B", ... },
  --   "team":  { "name": "A", "role": "B", ... } }
  column_mapping        jsonb NOT NULL DEFAULT '{}',
  mapping_template_id   uuid REFERENCES public.mapping_templates(id) ON DELETE SET NULL,
  oauth_access_token    text,   -- AES-256-GCM encrypted
  oauth_refresh_token   text,   -- AES-256-GCM encrypted
  oauth_token_expiry    timestamptz,
  sync_enabled          boolean NOT NULL DEFAULT true,
  sync_interval_minutes int     NOT NULL DEFAULT 5,
  last_synced_at        timestamptz,
  last_sync_status      text    NOT NULL DEFAULT 'pending'
                        CHECK (last_sync_status IN ('pending', 'running', 'success', 'error')),
  last_sync_error       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_sheet_connections_tenant ON public.sheet_connections(tenant_id);

-- ─── sync_logs ───────────────────────────────────────────────────────────────
CREATE TABLE public.sync_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_connection_id   uuid NOT NULL REFERENCES public.sheet_connections(id) ON DELETE CASCADE,
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  status                text NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'success', 'error', 'partial')),
  rows_processed        int NOT NULL DEFAULT 0,
  rows_imported         int NOT NULL DEFAULT 0,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_tenant_id            ON public.sync_logs(tenant_id);
CREATE INDEX idx_sync_logs_sheet_connection_id  ON public.sync_logs(sheet_connection_id);
CREATE INDEX idx_sync_logs_started_at           ON public.sync_logs(started_at DESC);

-- ─── calls ───────────────────────────────────────────────────────────────────
CREATE TABLE public.calls (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sheet_row_index     int  NOT NULL,   -- 1-based row number, used for upsert dedup
  date                date,
  setter              text,
  closer              text,
  lead_name           text,
  call_booked_at      timestamptz,
  call_scheduled_at   timestamptz,
  status              text CHECK (status IN ('booked','showed','no-show','rescheduled','canceled')),
  outcome             text CHECK (outcome IN ('closed','follow-up','lost') OR outcome IS NULL),
  cash_collected      numeric(12,2),
  contract_value      numeric(12,2),
  excluded            boolean NOT NULL DEFAULT false,
  exclusion_reason    text,
  raw_data            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, sheet_row_index)
);

CREATE INDEX idx_calls_tenant_id ON public.calls(tenant_id);
CREATE INDEX idx_calls_date      ON public.calls(tenant_id, date);
CREATE INDEX idx_calls_setter    ON public.calls(tenant_id, setter);
CREATE INDEX idx_calls_closer    ON public.calls(tenant_id, closer);
CREATE INDEX idx_calls_status    ON public.calls(tenant_id, status);

-- ─── leads ───────────────────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sheet_row_index int  NOT NULL,
  date            date,
  source          text,
  lead_name       text,
  setter          text,
  status          text,
  notes           text,
  excluded        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, sheet_row_index)
);

CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX idx_leads_date      ON public.leads(tenant_id, date);

-- ─── team_members ─────────────────────────────────────────────────────────────
CREATE TABLE public.team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text,
  role        text CHECK (role IN ('setter','closer','manager')),
  email       text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_tenant_id ON public.team_members(tenant_id);

-- ─── audit_logs ──────────────────────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  entity_type  text,
  entity_id    text,
  before_data  jsonb,
  after_data   jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_id  ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor_id   ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================
-- RLS — Enable on all tables
-- ============================================================
ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Helper Functions (SECURITY DEFINER — run as postgres)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT system_role = 'agency_admin'
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_agency_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT system_role IN ('agency_admin', 'agency_agent')
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

-- Returns the current user's role in a specific tenant, null if no membership.
CREATE OR REPLACE FUNCTION public.tenant_role(p_tenant_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role
  FROM public.tenant_memberships
  WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND invite_status = 'accepted';
$$;

-- True if the current user has any accepted membership in a tenant.
CREATE OR REPLACE FUNCTION public.has_tenant_access(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
  );
$$;

-- ============================================================
-- RLS Policies — user_profiles
-- ============================================================
CREATE POLICY "users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid() OR public.is_agency_staff());

CREATE POLICY "users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Agency admins can change system_role
CREATE POLICY "admin can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (public.is_agency_admin());

-- ============================================================
-- RLS Policies — tenants
-- ============================================================
CREATE POLICY "agency staff can read all tenants"
  ON public.tenants FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "client members can read own tenant"
  ON public.tenants FOR SELECT
  USING (public.has_tenant_access(id));

CREATE POLICY "agency admin can insert tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (public.is_agency_admin());

CREATE POLICY "agency admin can update tenants"
  ON public.tenants FOR UPDATE
  USING (public.is_agency_admin());

CREATE POLICY "agency admin can delete tenants"
  ON public.tenants FOR DELETE
  USING (public.is_agency_admin());

-- ============================================================
-- RLS Policies — tenant_memberships
-- ============================================================
CREATE POLICY "agency staff can read all memberships"
  ON public.tenant_memberships FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "user can read own membership"
  ON public.tenant_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "client owner can read own tenant memberships"
  ON public.tenant_memberships FOR SELECT
  USING (public.tenant_role(tenant_id) = 'client_owner');

CREATE POLICY "agency staff can insert memberships"
  ON public.tenant_memberships FOR INSERT
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "client owner can invite to own tenant"
  ON public.tenant_memberships FOR INSERT
  WITH CHECK (public.tenant_role(tenant_id) = 'client_owner');

CREATE POLICY "agency admin can update memberships"
  ON public.tenant_memberships FOR UPDATE
  USING (public.is_agency_admin());

CREATE POLICY "client owner can update own tenant memberships"
  ON public.tenant_memberships FOR UPDATE
  USING (public.tenant_role(tenant_id) = 'client_owner');

CREATE POLICY "agency admin can delete memberships"
  ON public.tenant_memberships FOR DELETE
  USING (public.is_agency_admin());

CREATE POLICY "client owner can revoke own tenant memberships"
  ON public.tenant_memberships FOR DELETE
  USING (public.tenant_role(tenant_id) = 'client_owner');

-- ============================================================
-- RLS Policies — mapping_templates (agency staff only)
-- ============================================================
CREATE POLICY "agency staff can read mapping templates"
  ON public.mapping_templates FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "agency staff can insert mapping templates"
  ON public.mapping_templates FOR INSERT
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "agency staff can update mapping templates"
  ON public.mapping_templates FOR UPDATE
  USING (public.is_agency_staff());

CREATE POLICY "agency staff can delete mapping templates"
  ON public.mapping_templates FOR DELETE
  USING (public.is_agency_staff());

-- ============================================================
-- RLS Policies — sheet_connections (agency staff only, never clients)
-- ============================================================
CREATE POLICY "agency staff can read sheet connections"
  ON public.sheet_connections FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "agency staff can insert sheet connections"
  ON public.sheet_connections FOR INSERT
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "agency staff can update sheet connections"
  ON public.sheet_connections FOR UPDATE
  USING (public.is_agency_staff());

CREATE POLICY "agency staff can delete sheet connections"
  ON public.sheet_connections FOR DELETE
  USING (public.is_agency_staff());

-- ============================================================
-- RLS Policies — sync_logs (agency staff only)
-- ============================================================
CREATE POLICY "agency staff can read sync logs"
  ON public.sync_logs FOR SELECT
  USING (public.is_agency_staff());

-- INSERT is service role only (cron job). No anon/user INSERT policy needed.

-- ============================================================
-- RLS Policies — calls
-- ============================================================
CREATE POLICY "agency staff can read all calls"
  ON public.calls FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "client owner and manager can read tenant calls"
  ON public.calls FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.tenant_role(tenant_id) IN ('client_owner', 'client_manager')
    AND excluded = false
  );

CREATE POLICY "client setter can read own calls"
  ON public.calls FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.tenant_role(tenant_id) = 'client_setter'
    AND setter = (SELECT full_name FROM public.user_profiles WHERE id = auth.uid())
    AND excluded = false
  );

CREATE POLICY "client closer can read own calls"
  ON public.calls FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.tenant_role(tenant_id) = 'client_closer'
    AND closer = (SELECT full_name FROM public.user_profiles WHERE id = auth.uid())
    AND excluded = false
  );

-- INSERT/UPDATE/DELETE: service role only (sync engine uses service client).
-- Agents use the admin API (service role) to set excluded/exclusion_reason.

-- ============================================================
-- RLS Policies — leads
-- ============================================================
CREATE POLICY "agency staff can read all leads"
  ON public.leads FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "client owner and manager can read tenant leads"
  ON public.leads FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.tenant_role(tenant_id) IN ('client_owner', 'client_manager')
    AND excluded = false
  );

CREATE POLICY "client setter can read own leads"
  ON public.leads FOR SELECT
  USING (
    public.has_tenant_access(tenant_id)
    AND public.tenant_role(tenant_id) = 'client_setter'
    AND setter = (SELECT full_name FROM public.user_profiles WHERE id = auth.uid())
    AND excluded = false
  );

-- ============================================================
-- RLS Policies — team_members
-- ============================================================
CREATE POLICY "agency staff can read all team members"
  ON public.team_members FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "tenant members can read own team"
  ON public.team_members FOR SELECT
  USING (public.has_tenant_access(tenant_id));

-- INSERT/UPDATE/DELETE: service role only (sync engine).

-- ============================================================
-- RLS Policies — audit_logs
-- ============================================================
CREATE POLICY "agency staff can read all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_agency_staff());

CREATE POLICY "client owner can read own tenant audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    tenant_id IS NOT NULL
    AND public.tenant_role(tenant_id) = 'client_owner'
  );

-- INSERT: service role only.

-- ============================================================
-- Updated_at trigger (shared)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sheet_connections_updated_at
  BEFORE UPDATE ON public.sheet_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_mapping_templates_updated_at
  BEFORE UPDATE ON public.mapping_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Storage bucket for tenant logos
-- ============================================================
-- Run this separately in the Supabase Dashboard → Storage, or via the CLI:
-- supabase storage create tenant-assets --public false
-- Then add an RLS policy on storage.objects:
--   SELECT: public.has_tenant_access((storage.foldername(name))[1]::uuid)
--   INSERT: public.is_agency_staff() OR public.tenant_role(...) IN ('client_owner')

-- ============================================================
-- Seed: default agency admin
-- ============================================================
-- After running this migration, promote your first user to agency_admin via:
-- UPDATE public.user_profiles SET system_role = 'agency_admin' WHERE id = '<your-auth-uid>';
