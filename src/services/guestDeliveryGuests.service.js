const workersGuest = () => import('./workersGuest.service');
import { guestDeliveryService } from './guestDelivery.service';

export const guestDeliveryGuestsService = {
  async getGuests(photographerId, eventId) {
    if (!eventId) return [];
    return (await workersGuest()).getGuests(photographerId, eventId);
  },

  async deleteGuest(photographerId, eventId, guestId) {
    await (await workersGuest()).deleteGuest(photographerId, eventId, guestId);
    await guestDeliveryService.incrementGuestCount(eventId, -1);
  },
};

export async function registerGuestViaApi({ slug, name, email, phone, selfieBase64 }) {
  const { apiFetch } = await import('../lib/api/client');
  const data = await apiFetch('/v1/guest/register', {
    method: 'POST',
    auth: false,
    body: { slug, name, email, phone: phone || null, selfieBase64 },
  });
  if (!data?.guest) throw new Error('Registration failed. Please try again.');
  return data.guest;
}
