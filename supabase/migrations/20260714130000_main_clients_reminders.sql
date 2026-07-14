-- Main Clients Reminders (Email & WhatsApp) for Sales Automation
-- Stores design/content per photographer campaign reminder and supports delivery logs.

CREATE TABLE IF NOT EXISTS main_clients_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  reminder_key TEXT NOT NULL,

  -- Toggle + schedule context
  enabled BOOLEAN NOT NULL DEFAULT true,
  discount NUMERIC,
  discount_code TEXT,
  duration_days INTEGER,
  active_banner_key TEXT,
  active_banner JSONB DEFAULT '{}'::jsonb,

  -- Email design & content
  layout TEXT DEFAULT 'Standard',
  subject TEXT,
  title TEXT,
  message TEXT,
  button_text TEXT DEFAULT 'VISIT SHOP',
  bg_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#000000',
  btn_color TEXT DEFAULT '#5d6050',
  btn_text_color TEXT DEFAULT '#ffffff',
  logo_type TEXT DEFAULT 'Dark Logo, for light background',
  icons_type TEXT DEFAULT 'Dark Icons, for light background',
  custom_image TEXT,

  -- WhatsApp
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_template TEXT,

  -- Last successful apply summary
  last_sent_at TIMESTAMPTZ,
  last_email_count INTEGER NOT NULL DEFAULT 0,
  last_whatsapp_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT main_clients_reminders_key_chk CHECK (
    reminder_key IN ('announcement', 'reminder_1w', 'reminder_3d', 'reminder_1d')
  ),
  CONSTRAINT main_clients_reminders_unique UNIQUE (photographer_id, campaign_id, reminder_key)
);

CREATE INDEX IF NOT EXISTS main_clients_reminders_photographer_idx
  ON main_clients_reminders (photographer_id);

CREATE INDEX IF NOT EXISTS main_clients_reminders_campaign_idx
  ON main_clients_reminders (photographer_id, campaign_id);

CREATE TABLE IF NOT EXISTS main_clients_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES main_clients_reminders(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS main_clients_reminder_deliveries_reminder_idx
  ON main_clients_reminder_deliveries (reminder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS main_clients_reminder_deliveries_recipient_idx
  ON main_clients_reminder_deliveries (photographer_id, channel, recipient);

ALTER TABLE main_clients_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_clients_reminder_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photographers manage own main_clients_reminders"
  ON main_clients_reminders;
CREATE POLICY "Photographers manage own main_clients_reminders"
  ON main_clients_reminders
  FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS "Photographers read own main_clients_reminder_deliveries"
  ON main_clients_reminder_deliveries;
CREATE POLICY "Photographers read own main_clients_reminder_deliveries"
  ON main_clients_reminder_deliveries
  FOR SELECT
  USING (photographer_id = auth.uid());

COMMENT ON TABLE main_clients_reminders IS
  'Sales Automation Main Clients Reminders — email/WhatsApp design, colors, templates per campaign.';
COMMENT ON TABLE main_clients_reminder_deliveries IS
  'Delivery log for Main Clients Reminders (shop emails + payment-cart phones).';
