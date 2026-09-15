const workersMobile = () => import('./workersMobile.service');
import { getFileMime } from '../lib/fileMime';

export const MAX_JPEG_BYTES = 100 * 1024 * 1024;

export function isMobileGalleryJpeg(file) {
  if (!file?.name) return false;
  const mime = getFileMime(file);
  if (mime === 'image/jpeg') return true;
  return /\.jpe?g$/i.test(file.name);
}

export function validateMobileGalleryJpeg(file) {
  if (!isMobileGalleryJpeg(file)) {
    return 'Only JPEG files are accepted.';
  }
  if (file.size > MAX_JPEG_BYTES) {
    return 'Each file must be 100MB or smaller.';
  }
  return null;
}

export const mobileGalleryPhotosService = {
  async getPhotos(photographerId, appId) {
    return (await workersMobile()).getPhotos(photographerId, appId);
  },

  async uploadPhoto({
    photographerId,
    appId,
    appName,
    file,
    position = 0,
    onProgress = null,
  }) {
    const validationError = validateMobileGalleryJpeg(file);
    if (validationError) {
      throw new Error(validationError);
    }

    return (await workersMobile()).uploadPhoto({ photographerId, appId, appName, file, position, onProgress });
  },

  async deletePhoto(photographerId, appId, photoId) {
    return (await workersMobile()).deletePhoto(photographerId, appId, photoId);
  },

  async deletePhotos(photographerId, appId, photos) {
    for (const photo of photos) {
      await this.deletePhoto(photographerId, appId, photo.id);
    }
  },

  async updatePhotoOrder(photographerId, appId, orderedPhotoIds) {
    return (await workersMobile()).updatePhotoOrder(photographerId, appId, orderedPhotoIds);
  },
};
