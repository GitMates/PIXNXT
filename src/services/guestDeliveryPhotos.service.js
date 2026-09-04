import { supabase } from '../lib/supabase/client';
import { storageService } from './storage.service';
import { getFileMime } from '../lib/fileMime';
import { getImageDimensionsFast } from '../lib/imageDimensions';
import { guestDeliveryService } from './guestDelivery.service';
import { photographerQuotaService } from './photographerQuota.service';
import {
  buildUserModulePath,
  getPhotographerR2Folder,
  R2_USER_MODULES,
  safeR2PathSegment,
} from '../lib/photographerR2Folder';

const PHOTO_FIELDS =
  'id, event_id, photographer_id, filename, full_url, thumbnail_url, storage_path, size_bytes, width, height, position, ai_indexed_at, created_at';

export const MAX_JPEG_BYTES = 100 * 1024 * 1024;

const eventFolderCache = new Map();

async function getEventPathFolder(eventId, eventName) {
  const cacheKey = `${eventId}:${eventName || ''}`;
  if (eventFolderCache.has(cacheKey)) {
    return eventFolderCache.get(cacheKey);
  }

  const folder = `${safeR2PathSegment(eventName, 'event')}__${eventId}`;
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

  /** Guest Delivery photos across all events, shaped for Photo Library. */
  async getLibraryPhotos(photographerId) {
    if (!photographerId) return [];

    const mapRows = (rows, eventsById = null) =>
      (rows || []).map((row) => {
        const nested = Array.isArray(row.event) ? row.event[0] : row.event;
        const event = nested || eventsById?.get(row.event_id) || null;
        return {
          ...row,
          web_url: row.full_url,
          thumbnail_url: row.thumbnail_url || row.full_url,
          source: 'guest_delivery',
          event_id: row.event_id,
          collection: event
            ? { id: null, name: event.name, slug: event.slug }
            : null,
          is_starred: false,
        };
      });

    const { data, error } = await supabase
      .from('guest_delivery_photos')
      .select(`${PHOTO_FIELDS}, event:guest_delivery_events(id, name, slug)`)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (!error) return mapRows(data);

    const { data: photos, error: photosError } = await supabase
      .from('guest_delivery_photos')
      .select(PHOTO_FIELDS)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (photosError) throw photosError;

    const eventIds = [...new Set((photos || []).map((row) => row.event_id).filter(Boolean))];
    let eventsById = new Map();
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('guest_delivery_events')
        .select('id, name, slug')
        .in('id', eventIds);
      eventsById = new Map((events || []).map((event) => [event.id, event]));
    }

    return mapRows(photos, eventsById);
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
      getPhotographerR2Folder(photographerId),
      getEventPathFolder(eventId, eventName),
    ]);
    const storagePath = buildUserModulePath(
      photographerFolder,
      R2_USER_MODULES.GUEST_DELIVERY,
      eventFolder,
      'photos',
      fileName
    );

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
    photographerQuotaService.invalidate(photographerId);
    photographerQuotaService.notifyQuotaChanged();
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
    photographerQuotaService.invalidate(photographerId);
    photographerQuotaService.notifyQuotaChanged();
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
