import { galleryService } from './gallery.service';

export const clientExclusiveAccessService = {
  async updateCollectionSettings(collectionId, settings) {
    return galleryService.updateCollection(collectionId, settings);
  },

  async updateSetClientOnly(setId, isClientOnly) {
    const workers = await import('./workersGallery.service');
    return workers.updateSetClientOnly(setId, isClientOnly);
  },

  async setPhotoPrivate(photoId, isPrivate, collectionId) {
    const workers = await import('./workersGallery.service');
    const photo = await workers.setPhotoPrivate(photoId, isPrivate, collectionId);
    const channel = new BroadcastChannel('pixnxt-gallery-update');
    channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId });
    channel.close();
    return photo;
  },
};
