import { supabase } from '../lib/supabase/client';

const PUBLIC_APP_FIELDS =
  'id, photographer_id, name, event_date, slug, icon_url, cover_image_url, status, settings';

export const mobileGalleryPublicService = {
  async getPublishedAppBySlug(slug) {
    const { data, error } = await supabase
      .from('mobile_gallery_apps')
      .select(PUBLIC_APP_FIELDS)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPublishedAppPhotos(appId) {
    const { data, error } = await supabase
      .from('mobile_gallery_photos')
      .select('id, filename, full_url, thumbnail_url, width, height, position')
      .eq('app_id', appId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getModuleBranding(photographerId) {
    const { data, error } = await supabase
      .from('mobile_gallery_settings')
      .select('settings')
      .eq('photographer_id', photographerId)
      .maybeSingle();

    if (error) throw error;
    return data?.settings || null;
  },

  async getPhotographerBranding(photographerId) {
    const { data, error } = await supabase
      .from('photographers')
      .select('business_name, display_name, profile_icon_url')
      .eq('id', photographerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
