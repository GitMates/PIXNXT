import { supabase } from '../lib/supabase/client';
import { guestDeliveryService } from './guestDelivery.service';

const GUEST_FIELDS =
  'id, event_id, photographer_id, name, email, phone, access_token, selfie_url, registered_at, delivery_status, delivery_email_sent_at, matched_photo_count, created_at';

function filterGuestsByPhotographer(rows, photographerId) {
  const list = rows || [];
  if (!photographerId) return list;
  const matched = list.filter((row) => row.photographer_id === photographerId);
  return matched.length > 0 || list.length === 0 ? matched : list;
}

export const guestDeliveryGuestsService = {
  async getGuests(photographerId, eventId) {
    if (!eventId) return [];

    const ordered = await supabase
      .from('event_guests')
      .select(GUEST_FIELDS)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false });

    if (!ordered.error) {
      return filterGuestsByPhotographer(ordered.data, photographerId);
    }

    const fallback = await supabase
      .from('event_guests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (fallback.error) throw ordered.error;
    return filterGuestsByPhotographer(fallback.data, photographerId);
  },

  async deleteGuest(photographerId, eventId, guestId) {
    const { error } = await supabase
      .from('event_guests')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('event_id', eventId)
      .eq('id', guestId);

    if (error) throw error;

    await guestDeliveryService.incrementGuestCount(eventId, -1);
  },
};

export async function registerGuestViaApi({ slug, name, email, phone, selfieBase64 }) {
  const res = await fetch('/api/guest-delivery/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      name,
      email,
      phone: phone || null,
      selfieBase64,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || 'Registration failed. Please try again.');
  }
  return payload.result;
}
