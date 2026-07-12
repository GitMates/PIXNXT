import { supabase } from '../lib/supabase/client';
import { guestDeliveryService } from './guestDelivery.service';

const GUEST_FIELDS =
  'id, event_id, photographer_id, name, email, phone, access_token, selfie_url, registered_at, delivery_status, delivery_email_sent_at, matched_photo_count, created_at';

export const guestDeliveryGuestsService = {
  async getGuests(photographerId, eventId) {
    const { data, error } = await supabase
      .from('event_guests')
      .select(GUEST_FIELDS)
      .eq('photographer_id', photographerId)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
