-- Daily rep activity log — one row per rep per day.
-- Supabase is the source of truth; Google Sheets is a write-only mirror.
CREATE TABLE daily_numbers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      uuid NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  date          date NOT NULL,
  calls_made    integer      NOT NULL DEFAULT 0,
  dms           integer      NOT NULL DEFAULT 0,
  connects      integer      NOT NULL DEFAULT 0,
  sets          integer      NOT NULL DEFAULT 0,
  shows         integer      NOT NULL DEFAULT 0,
  intro_units   integer      NOT NULL DEFAULT 0,
  major_units   integer      NOT NULL DEFAULT 0,
  sales         integer      NOT NULL DEFAULT 0,
  collections   numeric(10,2) NOT NULL DEFAULT 0,
  commissions   numeric(10,2) NOT NULL DEFAULT 0,
  terms_status  text         NOT NULL DEFAULT '',
  sheets_synced boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now(),
  UNIQUE (staff_id, date)
);

ALTER TABLE daily_numbers ENABLE ROW LEVEL SECURITY;
-- All reads/writes go through the service role client (server-side only).
CREATE POLICY "service role only" ON daily_numbers USING (false);
