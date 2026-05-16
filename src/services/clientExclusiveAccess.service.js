import { supabase } from '../lib/supabase/client';
import { galleryService } from './gallery.service';

export const clientExclusiveAccessService = {
  async updateCollectionSettings(collectionId, settings) {
    return galleryService.updateCollection(collectionId, settings);
  },

  async updateSetClientOnly(setId, isClientOnly) {
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
