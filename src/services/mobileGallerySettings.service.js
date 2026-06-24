import { supabase } from '../lib/supabase/client';

export const DEFAULT_MOBILE_GALLERY_SETTINGS = {
  contact_show_biography: true,
  contact_show_social_links: true,
  contact_show_contact_email: true,
  contact_show_phone: true,
  contact_show_business_address: true,
  contact_show_website: true,
  custom_domain: '',
  logo_url: '',
  show_pixnxt_branding: true,
};

function mergeSettings(stored) {
  return { ...DEFAULT_MOBILE_GALLERY_SETTINGS, ...(stored || {}) };
}

export const mobileGallerySettingsService = {
  async getSettings(photographerId) {
    const { data, error } = await supabase
      .from('mobile_gallery_settings')
      .select('settings')
      .eq('photographer_id', photographerId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.settings) {
      return { ...DEFAULT_MOBILE_GALLERY_SETTINGS };
    }

    return mergeSettings(data.settings);
  },

  async updateSettings(photographerId, updates) {
    const current = await this.getSettings(photographerId);
    const next = mergeSettings({ ...current, ...updates });
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('mobile_gallery_settings')
      .upsert(
        {
          photographer_id: photographerId,
          settings: next,
          updated_at: now,
        },
        { onConflict: 'photographer_id' }
      )
      .select('settings')
      .single();

    if (error) throw error;
    return mergeSettings(data?.settings || next);
  },
};
