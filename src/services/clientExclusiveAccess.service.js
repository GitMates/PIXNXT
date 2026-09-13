import { supabase } from '../lib/supabase/client';
import { USE_WORKERS_AUTH } from '../lib/api/client';
import { galleryService } from './gallery.service';

export const clientExclusiveAccessService = {
  async updateCollectionSettings(collectionId, settings) {
    return galleryService.updateCollection(collectionId, settings);
  },

  async updateSetClientOnly(setId, isClientOnly) {
    if (USE_WORKERS_AUTH) {
      // Ownership is enforced server-side (sets carry photographer_id).
      const { apiFetch } = await import('../lib/api/client');
      const data = await apiFetch(`/v1/galleries/sets/${setId}`, {
        method: 'PATCH',
        body: { is_private: isClientOnly ? 1 : 0 },
      });
      return data?.set;
    }
    const { data, error } = await supabase
      .from('sets')
      .update({ is_private: isClientOnly })
      .eq('id', setId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setPhotoPrivate(photoId, isPrivate, collectionId) {
    if (USE_WORKERS_AUTH) {
      const { apiFetch } = await import('../lib/api/client');
      const data = await apiFetch(`/v1/galleries/photos/${photoId}`, {
        method: 'PATCH',
        body: { is_private: isPrivate ? 1 : 0 },
      });
      try {
        await galleryService.logActivity(collectionId, 'gallery_view', {
          photoId,
          metadata: { type: 'photo_private', photo_id: photoId, is_private: isPrivate },
        });
      } catch (e) {
        console.warn('Private photo activity log failed:', e);
      }
      const channel = new BroadcastChannel('pixnxt-gallery-update');
      channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId });
      channel.close();
      return data?.photo;
    }
    const { data, error } = await supabase
      .from('photos')
      .update({ is_private: isPrivate })
      .eq('id', photoId)
      .select('id, is_private, collection_id')
      .single();
    if (error) throw error;

    try {
      await galleryService.logActivity(collectionId, 'gallery_view', {
        photoId,
        metadata: {
          type: 'photo_private',
          photo_id: photoId,
          is_private: isPrivate,
        },
      });
    } catch (e) {
      console.warn('Private photo activity log failed:', e);
    }

    const channel = new BroadcastChannel('pixnxt-gallery-update');
    channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId });
    channel.close();

    return data;
  },
};
