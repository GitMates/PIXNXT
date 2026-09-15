const workersGuest = () => import('./workersGuest.service');
import { userStorageService } from './userStorage.service';
import { photographerQuotaService } from './photographerQuota.service';

export const guestDeliveryService = {
  async getEvents(photographerId) {
    return (await workersGuest()).getEvents(photographerId);
  },

  async getEvent(photographerId, eventId) {
    return (await workersGuest()).getEvent(photographerId, eventId);
  },

  async getEventBySlug(slug) {
    return (await workersGuest()).getEventBySlug(slug);
  },

  async createEvent({ photographer_id, name, event_date = null }) {
    return (await workersGuest()).createEvent({ photographer_id, name, event_date });
  },

  async updateEvent(photographerId, eventId, updates) {
    return (await workersGuest()).updateEvent(photographerId, eventId, updates);
  },

  async setRegistrationEnabled(photographerId, eventId, enabled) {
    return this.updateEvent(photographerId, eventId, { registration_enabled: Boolean(enabled) });
  },

  async patchEventSettings(photographerId, eventId, currentSettings, settingsPatch) {
    const settings = { ...(currentSettings || {}), ...settingsPatch };
    return this.updateEvent(photographerId, eventId, { settings });
  },

  async deleteEvent(photographerId, eventId) {
    await (await workersGuest()).deleteEvent(photographerId, eventId);
    userStorageService.notifyStorageChanged();
    photographerQuotaService.invalidate(photographerId);
    photographerQuotaService.notifyQuotaChanged();
  },

  async incrementGuestCount() {
    // Server-maintained in Workers mode (register/delete adjust counts).
    return;
  },

  async createLinkedEvent({ collectionId, photographerId, name, eventDate, slug }) {
    const data = await (await workersGuest()).createLinkedEvent({ collectionId, photographerId, name, eventDate, slug });
    photographerQuotaService.invalidate(photographerId);
    photographerQuotaService.notifyQuotaChanged();
    return data;
  },

  async getEventByCollectionId(collectionId) {
    return (await workersGuest()).getEventByCollectionId(collectionId);
  },

  async incrementPhotoCount() {
    // Server-maintained in Workers mode (photo create/delete adjust counts).
    return;
  },
};
