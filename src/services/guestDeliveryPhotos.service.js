import { supabase } from '../lib/supabase/client';
import { storageService } from './storage.service';
import { getFileMime } from '../lib/fileMime';
import { getImageDimensionsFast } from '../lib/imageDimensions';
import { guestDeliveryService } from './guestDelivery.service';

const PHOTO_FIELDS =
  'id, event_id, photographer_id, filename, full_url, thumbnail_url, storage_path, size_bytes, width, height, position, ai_indexed_at, created_at';

export const MAX_JPEG_BYTES = 100 * 1024 * 1024;

function safePathSegment(value, fallback = 'item') {
  const raw = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return raw || fallback;
}

const photographerFolderCache = new Map();
const eventFolderCache = new Map();

async function getPhotographerPathFolder(photographerId) {
  if (photographerFolderCache.has(photographerId)) {
    return photographerFolderCache.get(photographerId);
  }

  const { data } = await supabase
    .from('photographers')
    .select('display_name, email')
    .eq('id', photographerId)
    .maybeSingle();

  const emailPrefix = data?.email?.split('@')[0];
  const folder = safePathSegment(data?.display_name || emailPrefix || photographerId, 'photographer');
  photographerFolderCache.set(photographerId, folder);
  return folder;
}

async function getEventPathFolder(eventId, eventName) {
  const cacheKey = `${eventId}:${eventName || ''}`;
  if (eventFolderCache.has(cacheKey)) {
    return eventFolderCache.get(cacheKey);
  }

  const folder = `${safePathSegment(eventName, 'event')}__${eventId}`;
  eventFolderCache.set(cacheKey, folder);
  return folder;
}

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
    const { data, error } = await supabase
      .from('guest_delivery_photos')
      .select(PHOTO_FIELDS)
      .eq('photographer_id', photographerId)
      .eq('event_id', eventId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
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

    onProgress?.(1);

    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const [photographerFolder, eventFolder] = await Promise.all([
      getPhotographerPathFolder(photographerId),
      getEventPathFolder(eventId, eventName),
    ]);
    const storagePath = `users/${photographerFolder}/guestdelivery/${eventFolder}/photos/${fileName}`;

    const mime = getFileMime(file);
    const uploadBody =
      file.type === mime
        ? file
        : new File([file], file.name, { type: mime, lastModified: file.lastModified });

    const { url: publicUrl } = await storageService.upload(storagePath, uploadBody, onProgress);
    const dimensions = await getImageDimensionsFast(file);

    const { data, error } = await supabase
      .from('guest_delivery_photos')
      .insert([
        {
          event_id: eventId,
          photographer_id: photographerId,
          filename: file.name,
          full_url: publicUrl,
          thumbnail_url: publicUrl,
          storage_path: storagePath,
          size_bytes: file.size,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          position,
        },
      ])
      .select(PHOTO_FIELDS)
      .single();

    if (error) throw error;

    await guestDeliveryService.incrementPhotoCount(eventId, 1);
    return data;
  },

  async deletePhoto(photographerId, eventId, photoId, storagePath) {
    const { error } = await supabase
      .from('guest_delivery_photos')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('event_id', eventId)
      .eq('id', photoId);

    if (error) throw error;

    if (storagePath) {
      try {
        await storageService.delete(storagePath);
      } catch (err) {
        console.warn('Failed to delete storage object:', err);
      }
    }

    await guestDeliveryService.incrementPhotoCount(eventId, -1);
  },

  async deletePhotos(photographerId, eventId, photos) {
    for (const photo of photos) {
      await this.deletePhoto(photographerId, eventId, photo.id, photo.storage_path);
    }
  },

  async updatePhotoOrder(photographerId, eventId, orderedPhotoIds) {
    for (let index = 0; index < orderedPhotoIds.length; index += 1) {
      const id = orderedPhotoIds[index];
      const { error } = await supabase
        .from('guest_delivery_photos')
        .update({ position: index })
        .eq('photographer_id', photographerId)
        .eq('event_id', eventId)
        .eq('id', id);

      if (error) throw error;
    }
  },
};
