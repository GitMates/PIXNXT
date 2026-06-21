import { supabase } from '../lib/supabase/client';

const APP_FIELDS =
  'id, photographer_id, name, event_date, slug, icon_url, cover_image_url, status, collection_id, settings, created_at, updated_at';

function generatePublicSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug = '';
  for (let i = 0; i < 6; i += 1) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

async function generateUniquePublicSlug() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slug = generatePublicSlug();
    const { data, error } = await supabase
      .from('mobile_gallery_apps')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return slug;
  }

  return `mg${Date.now().toString(36).slice(-8)}`;
}

function normalizeName(name) {
  return String(name || '').trim();
}

async function ensurePhotographer(photographerId) {
  const { data: existing, error: existingError } = await supabase
    .from('photographers')
    .select('id')
    .eq('id', photographerId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  if (existing) return;

  const { error: insertError } = await supabase
    .from('photographers')
    .insert([{ id: photographerId }]);

  if (insertError) throw insertError;
}

export const mobileGalleryService = {
  async getApps(photographerId) {
    const { data, error } = await supabase
      .from('mobile_gallery_apps')
      .select(APP_FIELDS)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getApp(photographerId, appId) {
    const { data, error } = await supabase
      .from('mobile_gallery_apps')
      .select(APP_FIELDS)
      .eq('photographer_id', photographerId)
      .eq('id', appId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createApp({ photographer_id, name, event_date = null }) {
    const trimmedName = normalizeName(name);
    if (!trimmedName) {
      throw new Error('App name is required.');
    }

    await ensurePhotographer(photographer_id);

    const slug = await generateUniquePublicSlug();
    const now = new Date().toISOString();
    const payload = {
      photographer_id,
      name: trimmedName,
      event_date: event_date || null,
      slug,
      status: 'draft',
      settings: {},
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('mobile_gallery_apps')
      .insert([payload])
      .select(APP_FIELDS)
      .single();

    if (error) throw error;
    return data;
  },

  async updateApp(photographerId, appId, updates) {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('mobile_gallery_apps')
      .update(payload)
      .eq('photographer_id', photographerId)
      .eq('id', appId)
      .select(APP_FIELDS)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteApp(photographerId, appId) {
    const { error } = await supabase
      .from('mobile_gallery_apps')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('id', appId);

    if (error) throw error;
  },
};
