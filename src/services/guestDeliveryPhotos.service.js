const workersGuest = () => import('./workersGuest.service');
import { getFileMime } from '../lib/fileMime';
import { photographerQuotaService } from './photographerQuota.service';

export const MAX_JPEG_BYTES = 100 * 1024 * 1024;

export function isGuestDeliveryJpeg(file) {
  if (!file?.name) return false;
  const mime = getFileMime(file);
  if (mime === 'image/jpeg') return true;
  return /\.jpe?g$/i.test(file.name);
}

export function validateGuestDeliveryJpeg(file) {
  if (!isGuestDeliveryJpeg(file)) {
    return 'Only JPEG files are accepted.';
  }
  if (file.size > MAX_JPEG_BYTES) {
    return 'Each file must be 100MB or smaller.';
  }
  return null;
}

export const guestDeliveryPhotosService = {
  async getPhotos(photographerId, eventId) {
    return (await workersGuest()).getPhotos(photographerId, eventId);
  },

  /** Guest Delivery photos across all events, shaped for Photo Library. */
  async getLibraryPhotos(photographerId) {
    if (!photographerId) return [];
    return (await workersGuest()).getLibraryPhotos();
  },

  async uploadPhoto({
    photographerId,
    eventId,
    eventName,
    file,
    position = 0,
    onProgress = null,
  }) {
    const validationError = validateGuestDeliveryJpeg(file);
    if (validationError) {
      throw new Error(validationError);
    }
    if (photographerId) {
      await photographerQuotaService.assertGuestImageQuota(photographerId, 1);
    }

    return (await workersGuest()).uploadGuestPhoto({ photographerId, eventId, file, position, onProgress });
  },

  async deletePhoto(photographerId, eventId, photoId, storagePath) {
    return (await workersGuest()).deleteGuestPhoto(photographerId, eventId, photoId);
  },

  async deletePhotos(photographerId, eventId, photos) {
    for (const photo of photos) {
      await this.deletePhoto(photographerId, eventId, photo.id, photo.storage_path);
    }
  },

  async updatePhotoOrder(photographerId, eventId, orderedPhotoIds) {
    return (await workersGuest()).updateGuestPhotoOrder(photographerId, eventId, orderedPhotoIds);
  },
};
