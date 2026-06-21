import { supabase } from '../lib/supabase/client';
import { storageService } from './storage.service';
import { getFileMime } from '../lib/fileMime';
import { getImageDimensionsFast } from '../lib/imageDimensions';

const PHOTO_FIELDS =
  'id, app_id, photographer_id, filename, full_url, thumbnail_url, storage_path, size_bytes, width, height, position, created_at';

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

async function getPhotographerPathFolder(photographerId) {
  const { data } = await supabase
    .from('photographers')
    .select('display_name, email')
    .eq('id', photographerId)
    .maybeSingle();

  const emailPrefix = data?.email?.split('@')[0];
  return safePathSegment(data?.display_name || emailPrefix || photographerId, 'photographer');
}

async function getAppPathFolder(appId, appName) {
  return `${safePathSegment(appName, 'app')}__${appId}`;
}

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
    const { data, error } = await supabase
      .from('mobile_gallery_photos')
      .select(PHOTO_FIELDS)
      .eq('photographer_id', photographerId)
      .eq('app_id', appId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
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

    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const [photographerFolder, appFolder] = await Promise.all([
      getPhotographerPathFolder(photographerId),
      getAppPathFolder(appId, appName),
    ]);
    const storagePath = `users/${photographerFolder}/mobilegallery/${appFolder}/photos/${fileName}`;

    const mime = getFileMime(file);
    const uploadBody =
      file.type === mime
        ? file
        : new File([file], file.name, { type: mime, lastModified: file.lastModified });

    const [{ url: publicUrl }, dimensions] = await Promise.all([
      storageService.upload(storagePath, uploadBody, onProgress),
      getImageDimensionsFast(file),
    ]);

    const { data, error } = await supabase
      .from('mobile_gallery_photos')
      .insert([
        {
          app_id: appId,
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
    return data;
  },

  async deletePhoto(photographerId, appId, photoId, storagePath) {
    const { error } = await supabase
      .from('mobile_gallery_photos')
      .delete()
      .eq('photographer_id', photographerId)
      .eq('app_id', appId)
      .eq('id', photoId);

    if (error) throw error;

    if (storagePath) {
      try {
        await storageService.delete(storagePath);
      } catch (err) {
        console.warn('Failed to delete storage object:', err);
      }
    }
  },

  async deletePhotos(photographerId, appId, photos) {
    for (const photo of photos) {
      await this.deletePhoto(photographerId, appId, photo.id, photo.storage_path);
    }
  },

  async updatePhotoOrder(photographerId, appId, orderedPhotoIds) {
    const updates = orderedPhotoIds.map((id, index) => ({ id, position: index }));

    for (const { id, position } of updates) {
      const { error } = await supabase
        .from('mobile_gallery_photos')
        .update({ position })
        .eq('photographer_id', photographerId)
        .eq('app_id', appId)
        .eq('id', id);

      if (error) throw error;
    }
  },
};
