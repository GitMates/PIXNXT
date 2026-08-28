import { supabase } from '../lib/supabase/client';
import { userStorageService } from './userStorage.service';

const EVENT_FIELDS =
  'id, photographer_id, name, event_date, slug, cover_image_url, status, registration_enabled, match_threshold, published_at, photo_count, guest_count, collection_id, settings, created_at, updated_at';

function normalizeName(name) {
  return String(name || '').trim();
}

function generateSlug(name) {
  const base = normalizeName(name)
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'event'}-${Date.now().toString(36)}`;
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

export const guestDeliveryService = {
  async getEvents(photographerId) {
    const { data, error } = await supabase
      .from('guest_delivery_events')
      .select(EVENT_FIELDS)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getEvent(photographerId, eventId) {
    const { data, error } = await supabase
      .from('guest_delivery_events')
      .select(EVENT_FIELDS)
      .eq('photographer_id', photographerId)
      .eq('id', eventId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getEventBySlug(slug) {
    const { data, error } = await supabase
      .from('guest_delivery_events')
      .select('id, name, slug, event_date, status, registration_enabled, cover_image_url')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createEvent({ photographer_id, name, event_date = null }) {
    const trimmedName = normalizeName(name);
    if (!trimmedName) {
      throw new Error('Event name is required.');
    }

    await ensurePhotographer(photographer_id);

    const slug = generateSlug(trimmedName);
    const now = new Date().toISOString();
    const payload = {
      photographer_id,
      name: trimmedName,
      event_date: event_date || null,
      slug,
      status: 'draft',
      registration_enabled: true,
      settings: {},
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('guest_delivery_events')
      .insert([payload])
      .select(EVENT_FIELDS)
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(photographerId, eventId, updates) {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('guest_delivery_events')
      .update(payload)
      .eq('photographer_id', photographerId)
      .eq('id', eventId)
      .select(EVENT_FIELDS)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(photographerId, eventId) {
    const { error } = await supabase
      .from('guest_delivery_events')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('id', eventId);

    if (error) throw error;
    userStorageService.notifyStorageChanged();
  },

  async incrementGuestCount(eventId, delta = 1) {
    const { data: event, error: fetchError } = await supabase
      .from('guest_delivery_events')
      .select('guest_count')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!event) return;

    const { error } = await supabase
      .from('guest_delivery_events')
      .update({
        guest_count: Math.max(0, (event.guest_count || 0) + delta),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) throw error;
  },

  async createLinkedEvent({ collectionId, photographerId, name, eventDate, slug }) {
    await ensurePhotographer(photographerId);
    const eventSlug = slug
      ? `${slug.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
      : generateSlug(name);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('guest_delivery_events')
      .insert([{
        photographer_id: photographerId,
        name: normalizeName(name),
        event_date: eventDate || null,
        slug: eventSlug,
        status: 'draft',
        registration_enabled: true,
        collection_id: collectionId,
        settings: {},
        updated_at: now,
      }])
      .select(EVENT_FIELDS)
      .single();
    if (error) throw error;
    return data;
  },

  async getEventByCollectionId(collectionId) {
    const { data, error } = await supabase
      .from('guest_delivery_events')
      .select(EVENT_FIELDS)
      .eq('collection_id', collectionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async incrementPhotoCount(eventId, delta = 1) {
    const { data: event, error: fetchError } = await supabase
      .from('guest_delivery_events')
      .select('photo_count')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!event) return;

    const { error } = await supabase
      .from('guest_delivery_events')
      .update({
        photo_count: Math.max(0, (event.photo_count || 0) + delta),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) throw error;
  },
};
