const workersGuest = () => import('./workersGuest.service');

export const guestDeliveryPublishService = {
  async publishEvent(eventId) {
    return (await workersGuest()).publishEvent(eventId);
  },

  async sendDeliveryEmail({ eventId, guestId, sendCopy = false, channel = 'auto', photographerProfile = null }) {
    void photographerProfile;
    return (await workersGuest()).sendDeliveryEmail({ eventId, guestId, sendCopy, channel });
  },

  async loadGuestGallery({ slug, accessToken }) {
    return (await workersGuest()).loadGuestGallery({ slug, accessToken });
  },
};
