-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firstname   TEXT NOT NULL,
  lastname    TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  state       TEXT,
  timeframe   TEXT,
  product     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'New',
  source      TEXT NOT NULL DEFAULT 'Finfo Website',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'note',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads(status);
CREATE INDEX IF NOT EXISTS leads_product_idx    ON leads(product);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS activities_lead_idx  ON activities(lead_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read/write all leads
CREATE POLICY "staff_all_leads" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "staff_all_activities" ON activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role (webhook) can insert leads
CREATE POLICY "service_insert_leads" ON leads
  FOR INSERT TO service_role WITH CHECK (true);
