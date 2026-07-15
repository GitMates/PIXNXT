-- Persist Email Style offer-strip colors (below hero image) on Main Clients Reminders.
-- Without these columns the sent email fell back to active_banner.bg_color (old tan strip).

ALTER TABLE main_clients_reminders
  ADD COLUMN IF NOT EXISTS color_template TEXT,
  ADD COLUMN IF NOT EXISTS offer_bg_color TEXT,
  ADD COLUMN IF NOT EXISTS offer_title_color TEXT,
  ADD COLUMN IF NOT EXISTS offer_subtitle_color TEXT,
  ADD COLUMN IF NOT EXISTS offer_cta_bg TEXT,
  ADD COLUMN IF NOT EXISTS offer_cta_color TEXT;

COMMENT ON COLUMN main_clients_reminders.offer_bg_color IS
  'Email offer-strip background under the hero image (Style tab). Must not fall back to sales banner bg.';
COMMENT ON COLUMN main_clients_reminders.color_template IS
  'Selected Style color template id (forest|ink|slate|rose|midnight).';
