import { supabase } from '../lib/supabase/client';
import { getImageDimensionsFast } from '../lib/imageDimensions';
import { getFileMime, isVideoMime } from '../lib/fileMime';
import { generateCollectionSlug } from '../lib/collectionSlug';
import { storageService } from './storage.service';

/** Columns needed for dashboard grid (avoids heavy nested * payload). */
const DASHBOARD_PHOTO_FIELDS = `
  id,
  collection_id,
  set_id,
  filename,
  thumbnail_url,
  web_url,
  full_url,
  width,
  height,
  position,
  media_type,
  status,
  is_starred,
  is_private,
  exif_taken_at,
  original_storage_path,
  size_bytes,
  photographer_id,
  created_at
`.replace(/\s+/g, '');

const PHOTO_STORAGE_PATH_COLUMNS = [
  'original_storage_path',
  'thumbnail_storage_path',
  'web_storage_path',
  'watermarked_storage_path',
];

function collectPhotoStoragePaths(photo) {
  const paths = new Set();
  for (const col of PHOTO_STORAGE_PATH_COLUMNS) {
    if (photo?.[col]) paths.add(photo[col]);
  }
  const original = photo?.original_storage_path;
  if (original && !photo?.thumbnail_storage_path) {
    paths.add(original.replace(/\.[^.]+$/, '_thumb.jpg'));
  }
  return [...paths];
}

async function deleteStoragePaths(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const chunkSize = 1000;
  for (let i = 0; i < unique.length; i += chunkSize) {
    await storageService.delete(unique.slice(i, i + chunkSize));
  }
}

export const galleryService = {
  /**
   * Fetch all collections for a specific photographer (Dashboard view)
   */
  async getCollections(photographerId) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(size_bytes)
      `)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c) => {
      const photoRows = c.photos || [];
      const storage_bytes = photoRows.reduce((sum, p) => sum + (Number(p.size_bytes) || 0), 0);
      const storedTotal = Number(c.total_size_bytes);
      const { photos, ...rest } = c;
      return {
        ...rest,
        photo_count: rest.photo_count ?? photoRows.length,
        storage_bytes:
          Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : storage_bytes,
      };
    });
  },

  /**
   * Folders for the move-collection picker, with cover from folder or first collection inside.
   */
  async getFoldersForMove(photographerId) {
    if (!photographerId) return [];

    const { data: folders, error: folderError } = await supabase
      .from('folders')
      .select('id, name, cover_url, position, created_at')
      .eq('photographer_id', photographerId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (folderError) throw folderError;

    const { data: collections, error: collectionError } = await supabase
      .from('collections')
      .select('folder_id, cover_url, created_at')
      .eq('photographer_id', photographerId)
      .not('folder_id', 'is', null)
      .order('created_at', { ascending: true });

    if (collectionError) throw collectionError;

    const coverByFolder = {};
    for (const row of collections || []) {
      if (!row.folder_id || coverByFolder[row.folder_id] || !row.cover_url) continue;
      coverByFolder[row.folder_id] = row.cover_url;
    }

    return (folders || []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      cover_url: folder.cover_url || coverByFolder[folder.id] || null,
    }));
  },

  /**
   * @param {string} photographerId
   * @param {string | { name: string; eventDate?: string | null; showOnHomepage?: boolean; passwordEnabled?: boolean; password?: string | null }} nameOrOptions
   */
  async createFolder(photographerId, nameOrOptions) {
    const options =
      typeof nameOrOptions === 'string' ? { name: nameOrOptions } : nameOrOptions ?? {};
    const name = options.name?.trim();

    if (!photographerId || !name) {
      throw new Error('Folder name is required.');
    }

    const baseSlug = generateCollectionSlug(name);
    const slug = `${baseSlug}-${Date.now().toString(36).slice(2, 8)}`;

    const { data: existing } = await supabase
      .from('folders')
      .select('position')
      .eq('photographer_id', photographerId)
      .order('position', { ascending: false })
      .limit(1);

    const position = (existing?.[0]?.position ?? -1) + 1;
    const passwordEnabled = !!options.passwordEnabled;
    const password = options.password?.trim();

    const { data, error } = await supabase
      .from('folders')
      .insert({
        photographer_id: photographerId,
        name,
        slug,
        position,
        show_on_homepage: options.showOnHomepage !== false,
        event_date: options.eventDate || null,
        guest_password_hash: passwordEnabled && password ? password : null,
      })
      .select('id, name, cover_url, event_date, show_on_homepage')
      .single();

    if (error) throw error;
    return data;
  },

  async moveCollectionToFolder(collectionId, folderId) {
    if (!collectionId) {
      throw new Error('Collection is required.');
    }

    const { data, error } = await supabase
      .from('collections')
      .update({ folder_id: folderId ?? null })
      .eq('id', collectionId)
      .select('id, folder_id')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all published collections for a specific photographer (Public view)
   */
  async getPublicCollections(photographerId) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(count)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(c => ({
      ...c,
      photo_count: c.photos?.[0]?.count || 0
    }));
  },

  /**
   * Create a new collection
   */
  async createCollection(collectionData) {
    const { data, error } = await supabase
      .from('collections')
      .insert([collectionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Duplicate a collection: copies metadata, sets, and non-video photos (same storage URLs).
   */
  async duplicateCollection(sourceCollectionId, photographerId) {
    if (!sourceCollectionId || !photographerId) {
      throw new Error('Collection and photographer are required to duplicate.');
    }

    const source = await this.getCollectionById(sourceCollectionId);

    const newCollection = await this.createCollection({
      photographer_id: photographerId,
      name: `${source.name} (Copy)`,
      slug: `${generateCollectionSlug(source.name)}-copy-${Date.now().toString(36)}`,
      event_date: source.event_date ?? null,
      status: 'draft',
      description: source.description ?? null,
      font_family: source.font_family ?? 'sans_1',
      color_palette: source.color_palette ?? 'light_1',
      grid_style: source.grid_style ?? 'vertical',
      thumbnail_size: source.thumbnail_size ?? 'regular',
      grid_spacing: source.grid_spacing ?? 'regular',
      nav_style: source.nav_style ?? 'icons',
      privacy: source.privacy ?? 'public',
      cover_style: source.cover_style ?? 'photo',
      cover_url: source.cover_url ?? null,
      cover_focal_x: source.cover_focal_x ?? null,
      cover_focal_y: source.cover_focal_y ?? null,
      download_pin_hash: source.download_pin_hash ?? null,
      downloads_enabled: source.downloads_enabled,
      download_resolutions: source.download_resolutions,
      download_limit_gallery: source.download_limit_gallery ?? null,
      download_limit_contact: source.download_limit_contact ?? null,
      email_capture_enabled: source.email_capture_enabled,
      social_sharing_enabled: source.social_sharing_enabled,
      watermark_enabled: source.watermark_enabled,
      favorites_enabled: source.favorites_enabled,
      favorites_allow_comments: source.favorites_allow_comments,
      max_favorites: source.max_favorites ?? null,
      gallery_photo_sort: source.gallery_photo_sort ?? null,
      show_filenames: source.show_filenames,
      show_on_homepage: source.show_on_homepage,
      client_exclusive_enabled: source.client_exclusive_enabled,
      allow_clients_mark_private: source.allow_clients_mark_private,
      client_only_highlights: source.client_only_highlights,
    });

    const setIdMap = new Map();
    const sourceSets = [...(source.sets || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
    for (const set of sourceSets) {
      const created = await this.createSet({
        collectionId: newCollection.id,
        photographerId,
        name: set.name,
        description: set.description ?? '',
        position: set.position ?? 0,
      });
      setIdMap.set(set.id, created.id);
    }

    const sourcePhotos = [...(source.photos || [])]
      .filter((p) => p.media_type !== 'video')
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    if (sourcePhotos.length > 0) {
      const rows = sourcePhotos.map((p, index) => ({
        collection_id: newCollection.id,
        photographer_id: photographerId,
        set_id: p.set_id ? setIdMap.get(p.set_id) ?? null : null,
        filename: p.filename,
        full_url: p.full_url,
        web_url: p.web_url,
        thumbnail_url: p.thumbnail_url,
        original_storage_path: p.original_storage_path,
        size_bytes: p.size_bytes,
        width: p.width,
        height: p.height,
        media_type: p.media_type ?? 'image',
        position: p.position ?? index,
        status: p.status ?? 'ready',
        is_starred: p.is_starred ?? false,
        exif_taken_at: p.exif_taken_at ?? null,
        is_private: p.is_private ?? false,
      }));

      const { data: insertedPhotos, error: photoError } = await supabase
        .from('photos')
        .insert(rows)
        .select('id');

      if (photoError) throw photoError;

      if (source.cover_photo_id && insertedPhotos?.length) {
        const coverIndex = sourcePhotos.findIndex((p) => p.id === source.cover_photo_id);
        if (coverIndex >= 0 && insertedPhotos[coverIndex]?.id) {
          await this.updateCollection(newCollection.id, {
            cover_photo_id: insertedPhotos[coverIndex].id,
          });
          newCollection.cover_photo_id = insertedPhotos[coverIndex].id;
        }
      }
    }

    return newCollection;
  },

  /**
   * Update an existing collection
   */
  async updateCollection(id, updateData) {
    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a collection and all associated files
   */
  async deleteCollection(id) {
    // 1. Get collection info (to get photographer_id and list of photos)
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('photographer_id, photos:photos!photos_collection_id_fkey(original_storage_path)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete files from Storage if they exist
    const storagePaths = collection.photos
      ?.map(p => p.original_storage_path)
      .filter(path => !!path);

    if (storagePaths && storagePaths.length > 0) {
      try {
        await storageService.delete(storagePaths);
      } catch (storageError) {
        console.error('Error deleting storage files from R2:', storageError);
        // We continue anyway to at least delete the database records
      }
    }

    // 3. Delete the collection record (cascade deletes related DB tables)
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetch collection + sets + photos for the manage dashboard (parallel, slim photo fields).
   */
  async getCollectionDashboardData(id) {
    const [collectionRes, photosRes] = await Promise.all([
      supabase
        .from('collections')
        .select(`*, sets!sets_collection_id_fkey (*)`)
        .eq('id', id)
        .single(),
      supabase
        .from('photos')
        .select(DASHBOARD_PHOTO_FIELDS)
        .eq('collection_id', id)
        .order('position', { ascending: true }),
    ]);

    if (collectionRes.error) throw collectionRes.error;
    if (photosRes.error) throw photosRes.error;

    const data = collectionRes.data;
    if (data.sets) {
      data.sets.sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    data.photos = photosRes.data || [];
    return data;
  },

  /**
   * Fetch a single collection by ID (for management) — includes sets and photos
   */
  async getCollectionById(id) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos!photos_collection_id_fkey (${DASHBOARD_PHOTO_FIELDS}),
        sets!sets_collection_id_fkey (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (data.sets) {
      data.sets.sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    if (data.photos) {
      data.photos.sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    return data;
  },

  /**
   * Fetch a single collection by slug
   */
  async getCollectionBySlug(slug) {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        photos!photos_collection_id_fkey (
          id,
          filename,
          set_id,
          web_url,
          thumbnail_url,
          full_url,
          width,
          height,
          position,
          created_at,
          exif_taken_at,
          media_type,
          is_private
        ),
        sets!sets_collection_id_fkey (
          id,
          name,
          description,
          position,
          photo_count,
          is_private
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    if (data.photos) {
      data.photos.sort((a, b) => a.position - b.position);
    }
    if (data.sets) {
      data.sets.sort((a, b) => a.position - b.position);
    }

    return data;
  },

  // ─── SET CRUD ──────────────────────────────────────────────

  /**
   * Fetch all sets for a collection
   */
  async getSets(collectionId) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, name, description, position, photo_count, is_private, created_at')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Create a new set
   */
  async createSet({ collectionId, photographerId, name, description, position }) {
    const { data, error } = await supabase
      .from('sets')
      .insert([{
        collection_id: collectionId,
        photographer_id: photographerId,
        name,
        description: description || null,
        position: position ?? 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a set's name/description
   */
  async updateSet(setId, updateData) {
    const { data, error } = await supabase
      .from('sets')
      .update(updateData)
      .eq('id', setId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a set and all photos in it (DB + Cloudflare R2).
   */
  async deleteSet(setId) {
    const { data: photosInSet, error: fetchError } = await supabase
      .from('photos')
      .select('id')
      .eq('set_id', setId);

    if (fetchError) throw fetchError;

    const photoIds = (photosInSet || []).map((p) => p.id);
    if (photoIds.length > 0) {
      await this.deletePhotos(photoIds);
    }

    const { error } = await supabase.from('sets').delete().eq('id', setId);
    if (error) throw error;
  },

  /**
   * Assign photos to a specific set (or unassign by passing null)
   */
  async assignPhotosToSet(photoIds, setId) {
    if (!photoIds || photoIds.length === 0) return;

    const { error } = await supabase
      .from('photos')
      .update({ set_id: setId })
      .in('id', photoIds);

    if (error) throw error;
  },

  // ─── PHOTO OPERATIONS ─────────────────────────────────────

  /**
   * Upload multiple photos (legacy bulk upload)
   */
  async uploadPhotos(collectionId, photographerId, files, setId = null) {
    const uploadPromises = files.map((file, index) =>
      this.uploadPhoto(collectionId, photographerId, file, index, setId)
    );
    return Promise.all(uploadPromises);
  },

  /**
   * Upload a single photo to R2 and record in database.
   * @param {(percent: number) => void} [onProgress] — 0–100 based on bytes sent to R2
   */
  async uploadPhoto(collectionId, photographerId, file, index = 0, setId = null, onProgress = null) {
    if (!collectionId || !photographerId) {
      throw new Error('Collection or photographer is missing. Refresh the page and try again.');
    }

    const mime = getFileMime(file);
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${photographerId}/${collectionId}/${fileName}`;

    const isVideo = isVideoMime(mime);
    const isGif = mime === 'image/gif' || /\.gif$/i.test(file.name);
    const mediaType = isVideo ? 'video' : isGif ? 'gif' : 'image';

    const uploadBody =
      file.type === mime
        ? file
        : new File([file], file.name, { type: mime, lastModified: file.lastModified });

    const uploadPromise = storageService.upload(filePath, uploadBody, onProgress);

    const [{ url: publicUrl }, meta] = await Promise.all([
      uploadPromise,
      isVideo
        ? this._captureVideoThumbnail(file)
        : getImageDimensionsFast(file).then((dimensions) => ({ dimensions, thumbnailBlob: null })),
    ]);

    const dimensions = meta.dimensions ?? { width: null, height: null };
    const thumbnailBlob = meta.thumbnailBlob ?? null;

    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert([{
        collection_id: collectionId,
        photographer_id: photographerId,
        set_id: setId,
        filename: file.name,
        full_url: publicUrl,
        web_url: publicUrl,
        thumbnail_url: publicUrl,
        original_storage_path: filePath,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        media_type: mediaType,
        position: index,
        status: 'ready'
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    if (isVideo && thumbnailBlob) {
      const thumbnailPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
      void storageService.upload(thumbnailPath, thumbnailBlob).then(({ url: thumbUrl }) =>
        supabase.from('photos').update({ thumbnail_url: thumbUrl }).eq('id', photoData.id)
      ).catch((err) => console.warn('Video thumbnail upload deferred failed:', err));
    }

    return photoData;
  },

  _captureVideoThumbnail(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      const cleanup = () => URL.revokeObjectURL(url);

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve({
              dimensions: { width: video.videoWidth || null, height: video.videoHeight || null },
              thumbnailBlob: blob,
            });
          },
          'image/jpeg',
          0.8
        );
      };
      video.onerror = () => {
        cleanup();
        resolve({ dimensions: { width: null, height: null }, thumbnailBlob: null });
      };
      video.src = url;
    });
  },

  /**
   * Replace a photo's media in storage and update the existing row (keeps id, set, stars, etc.).
   */
  async replacePhoto(photoId, photographerId, collectionId, file, onProgress = null) {
    if (!collectionId || !photographerId) {
      throw new Error('Collection or photographer is missing. Refresh the page and try again.');
    }

    const { data: existing, error: fetchError } = await supabase
      .from('photos')
      .select(
        `id, collection_id, ${PHOTO_STORAGE_PATH_COLUMNS.join(', ')}`
      )
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;
    if (!existing || existing.collection_id !== collectionId) {
      throw new Error('Photo not found in this collection.');
    }

    const mime = getFileMime(file);
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${photographerId}/${collectionId}/${fileName}`;

    const isVideo = isVideoMime(mime);
    const isGif = mime === 'image/gif' || /\.gif$/i.test(file.name);
    const mediaType = isVideo ? 'video' : isGif ? 'gif' : 'image';

    const uploadBody =
      file.type === mime
        ? file
        : new File([file], file.name, { type: mime, lastModified: file.lastModified });

    const [{ url: publicUrl }, meta] = await Promise.all([
      storageService.upload(filePath, uploadBody, onProgress),
      isVideo
        ? this._captureVideoThumbnail(file)
        : getImageDimensionsFast(file).then((dimensions) => ({ dimensions, thumbnailBlob: null })),
    ]);

    const dimensions = meta.dimensions ?? { width: null, height: null };
    const thumbnailBlob = meta.thumbnailBlob ?? null;

    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .update({
        filename: file.name,
        full_url: publicUrl,
        web_url: publicUrl,
        thumbnail_url: publicUrl,
        original_storage_path: filePath,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        media_type: mediaType,
        status: 'ready',
      })
      .eq('id', photoId)
      .select()
      .single();

    if (dbError) throw dbError;

    if (isVideo && thumbnailBlob) {
      const thumbnailPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
      void storageService.upload(thumbnailPath, thumbnailBlob).then(({ url: thumbUrl }) =>
        supabase.from('photos').update({ thumbnail_url: thumbUrl }).eq('id', photoId)
      ).catch((err) => console.warn('Video thumbnail upload deferred failed:', err));
    }

    const oldPaths = collectPhotoStoragePaths(existing);
    void deleteStoragePaths(oldPaths).catch((err) =>
      console.warn('Failed to delete replaced photo storage:', err)
    );

    return photoData;
  },

  /**
   * Update photo metadata (filename, set_id, etc.)
   */
  async updatePhoto(id, updateData) {
    const { data, error } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete photos from Cloudflare R2 and the database (plus related rows).
   */
  async deletePhotos(ids) {
    if (!ids || ids.length === 0) return;

    const { data: rows, error: fetchError } = await supabase
      .from('photos')
      .select(
        `id, collection_id, ${PHOTO_STORAGE_PATH_COLUMNS.join(', ')}`
      )
      .in('id', ids);

    if (fetchError) throw fetchError;
    if (!rows?.length) return;

    const collectionIds = [...new Set(rows.map((r) => r.collection_id).filter(Boolean))];
    for (const collectionId of collectionIds) {
      const { data: collection, error: coverError } = await supabase
        .from('collections')
        .select('cover_photo_id')
        .eq('id', collectionId)
        .single();

      if (coverError) throw coverError;

      if (collection?.cover_photo_id && ids.includes(collection.cover_photo_id)) {
        const { error: clearCoverError } = await supabase
          .from('collections')
          .update({ cover_photo_id: null })
          .eq('id', collectionId);
        if (clearCoverError) throw clearCoverError;
      }
    }

    const { error: favError } = await supabase.from('favorite_items').delete().in('photo_id', ids);
    if (favError) throw favError;

    const { error: activityError } = await supabase.from('activity_log').delete().in('photo_id', ids);
    if (activityError) throw activityError;

    const storagePaths = rows.flatMap(collectPhotoStoragePaths);
    try {
      await deleteStoragePaths(storagePaths);
    } catch (storageError) {
      console.error('Error deleting storage files from R2:', storageError);
      throw storageError;
    }

    const { error } = await supabase.from('photos').delete().in('id', ids);
    if (error) throw error;
  },

  /**
   * Toggle the is_starred status of a photo
   */
  async togglePhotoStar(id, isStarred) {
    const { data, error } = await supabase
      .from('photos')
      .update({ is_starred: isStarred })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch a photographer's profile/branding
   */
  async getPhotographerProfile(photographerId) {
    const { data, error } = await supabase
      .from('photographers')
      .select('*')
      .eq('id', photographerId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create or get a client session for favorites/downloads
   * @param {string} collectionId
   * @param {string} email
   * @param {{ ensureDefaultFavoriteList?: boolean }} [options] Pass `{ ensureDefaultFavoriteList: false }` when the caller will insert their own preset list (e.g. dashboard "Create favorite list") so a duplicate "My Favorites" row is not created.
   */
  async createOrGetSession(collectionId, email, options = {}) {
    const { ensureDefaultFavoriteList = true } = options;
    if (!collectionId || !email) {
      throw new Error('Collection ID and email are required');
    }

    try {
      console.log('createOrGetSession starting:', { collectionId, email, ensureDefaultFavoriteList });
      // 1. Try to find existing session
      const { data: sessions, error: findError } = await supabase
        .from('client_sessions')
        .select('id, collection_id, visitor_email, access_level, expires_at')
        .eq('collection_id', collectionId)
        .eq('visitor_email', email)
        .limit(1);

      if (findError) {
        console.warn('Find session error:', findError);
      }

      let session = sessions?.[0];

      if (session) {
        console.log('Existing session found:', session);
      } else {
        // 2. Create new session (Blind insert to handle RLS)
        const insertData = {
          collection_id: collectionId,
          visitor_email: email,
          access_level: 'guest',
          created_at: new Date().toISOString()
        };
        
        console.log('Attempting blind insert for session:', insertData);
        const { error: insertError } = await supabase
          .from('client_sessions')
          .insert([insertData]);

        if (insertError && insertError.code !== '23505') { // Ignore unique constraint violation
          console.error('Session insertion failed:', insertError);
          throw new Error(`Session creation failed: ${insertError.message}`);
        }

        // 3. Fetch the created session
        const { data: fetchSession, error: fetchAgainError } = await supabase
          .from('client_sessions')
          .select('id, collection_id, visitor_email')
          .eq('collection_id', collectionId)
          .eq('visitor_email', email)
          .limit(1)
          .single();

        if (fetchAgainError) {
          console.error('Error fetching session after blind insert:', fetchAgainError);
          throw new Error('Failed to retrieve created session after insert. Please check RLS policies.');
        }
        session = fetchSession;
        console.log('New session created and retrieved:', session);
      }

      // Visitor flows: only create "My Favorites" when this session has no lists yet.
      // If the photographer already created a preset list (e.g. retouching) for this email,
      // do not add a second default list — hearts should target the preset list.
      if (ensureDefaultFavoriteList) {
        const { data: anyLists } = await supabase
          .from('favorite_lists')
          .select('id')
          .eq('session_id', session.id)
          .limit(1);

        if (!anyLists?.length) {
          console.log('Creating default favorite list for session:', session.id);
          const { error: insertListError } = await supabase
            .from('favorite_lists')
            .insert([{
              collection_id: collectionId,
              session_id: session.id,
              name: 'My Favorites'
            }]);

          if (insertListError) {
            console.error('Error creating default favorite list:', insertListError);
          }
        }
      }

      return session;
    } catch (error) {
      console.error('Error in createOrGetSession:', error);
      throw error;
    }
  },

  /**
   * Active list for a visitor session: prefer photographer preset (max_selection set), else "My Favorites", else oldest list.
   */
  async _resolveDefaultFavoriteList(sessionId) {
    if (!sessionId) return null;
    const { data: lists, error } = await supabase
      .from('favorite_lists')
      .select('id, name, max_selection, created_at, submitted_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error || !lists?.length) return null;

    const withCap = lists.filter((l) => l.max_selection != null && Number(l.max_selection) > 0);
    if (withCap.length) {
      return withCap[withCap.length - 1];
    }
    const my = lists.find((l) => l.name === 'My Favorites');
    if (my) return my;
    return lists[0];
  },

  async _getDefaultFavoriteListId(sessionId) {
    const row = await this._resolveDefaultFavoriteList(sessionId);
    return row?.id ?? null;
  },

  /** Public: list row used for gallery hearts / toasts (name + cap). */
  async getSessionDefaultFavoriteList(sessionId) {
    return this._resolveDefaultFavoriteList(sessionId);
  },

  /**
   * Favorited photo IDs for a visitor list (defaults to active preset / My Favorites).
   */
  async getFavorites(sessionId, listId = null) {
    if (!sessionId) return [];
    try {
      let targetListId = listId;
      if (!targetListId) {
        targetListId = await this._getDefaultFavoriteListId(sessionId);
      }
      if (!targetListId) return [];

      const { data: items, error: itemsError } = await supabase
        .from('favorite_items')
        .select('photo_id')
        .eq('list_id', targetListId);

      if (itemsError) return [];

      return [...new Set((items || []).map((item) => item.photo_id).filter(Boolean))];
    } catch (e) {
      console.error('Error in getFavorites:', e);
      return [];
    }
  },

  /**
   * Favorite list metadata for gallery selection UI.
   */
  async getFavoriteListById(listId, sessionId = null) {
    if (!listId) return null;
    const { data, error } = await supabase
      .from('favorite_lists')
      .select('id, name, max_selection, description, submitted_at, session_id, collection_id')
      .eq('id', listId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    if (sessionId && data.session_id !== sessionId) return null;
    return data;
  },

  /**
   * Submit (lock) a visitor favorite list — requires at least one photo.
   */
  async submitFavoriteList(listId, sessionId) {
    if (!listId || !sessionId) {
      throw new Error('List and session are required');
    }

    const { data: ok, error } = await supabase.rpc('submit_favorite_list', {
      p_list_id: listId,
      p_session_id: sessionId,
    });

    if (error) {
      const msg = error.message || '';
      if (/function .* does not exist|Could not find the function/i.test(msg)) {
        throw new Error(
          'Submit is not set up on the server yet. Run supabase/migrations/20260520120000_favorite_list_submit.sql, then try again.'
        );
      }
      throw error;
    }

    if (Number(ok) !== 1) {
      const meta = await this.getFavoriteListById(listId, sessionId);
      if (meta?.submitted_at) {
        const err = new Error('This list was already submitted.');
        err.code = 'ALREADY_SUBMITTED';
        throw err;
      }
      const err = new Error('Add at least one photo before confirming your favorites.');
      err.code = 'NO_PHOTOS';
      throw err;
    }

    return true;
  },

  /**
   * Email the collection photographer after a client confirms favorites.
   */
  async notifyPhotographerFavoriteSubmit({ listId, sessionId, siteOrigin, clientMessage }) {
    const { data, error } = await supabase.functions.invoke('send-favorite-submit-email', {
      body: {
        listId,
        sessionId,
        siteOrigin: siteOrigin || (typeof window !== 'undefined' ? window.location.origin : ''),
        clientMessage: clientMessage?.trim() || null,
      },
    });

    if (error) {
      throw new Error(error.message || 'Could not send notification email');
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  },

  /**
   * Create a favorite list (dashboard preset or visitor "new list").
   * @param {{ maxSelection?: number|null, description?: string|null }} [meta]
   */
  async createFavoriteList(collectionId, sessionId, listName, meta = {}) {
    const name = (listName && String(listName).trim()) || 'My Favorites';
    let maxVal = null;
    if (meta.maxSelection != null && meta.maxSelection !== '') {
      const n = Number(meta.maxSelection);
      if (Number.isFinite(n) && n > 0) maxVal = Math.floor(n);
    }
    const desc = meta.description != null && String(meta.description).trim()
      ? String(meta.description).trim().slice(0, 2000)
      : null;

    const insertRow = {
      collection_id: collectionId,
      session_id: sessionId,
      name,
      ...(maxVal != null ? { max_selection: maxVal } : {}),
      ...(desc ? { description: desc } : {}),
    };

    const { data, error } = await supabase
      .from('favorite_lists')
      .insert([insertRow])
      .select('id, name, session_id, max_selection')
      .single();

    if (error) {
      console.error('Error creating favorite list:', error);
      throw error;
    }
    return data;
  },

  /**
   * Toggle a photo as favorite
   */
  async toggleFavorite(sessionId, photoId, isFavorite, listId = null) {
    let targetListId = listId;

    if (!targetListId) {
      targetListId = await this._getDefaultFavoriteListId(sessionId);
      if (!targetListId) {
        throw new Error('Favorite list not found');
      }
    }

    const { data: listLock, error: lockErr } = await supabase
      .from('favorite_lists')
      .select('submitted_at')
      .eq('id', targetListId)
      .maybeSingle();

    if (!lockErr && listLock?.submitted_at) {
      const err = new Error('This favorite list has been submitted and cannot be changed.');
      err.code = 'LIST_SUBMITTED';
      throw err;
    }

    if (isFavorite) {
      const { data: listMeta, error: lmErr } = await supabase
        .from('favorite_lists')
        .select('max_selection')
        .eq('id', targetListId)
        .maybeSingle();

      if (!lmErr && listMeta?.max_selection != null && Number(listMeta.max_selection) > 0) {
        const cap = Number(listMeta.max_selection);
        const { count, error: cErr } = await supabase
          .from('favorite_items')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', targetListId);

        if (!cErr && (count || 0) >= cap) {
          const err = new Error('Selection limit reached for this list.');
          err.code = 'SELECTION_LIMIT';
          throw err;
        }
      }

      const { error } = await supabase
        .from('favorite_items')
        .insert([{
          list_id: targetListId,
          photo_id: photoId
        }]);
      if (error && error.code !== '23505') throw error; // Ignore unique constraint violation
    } else {
      // Remove favorite
      const { error } = await supabase
        .from('favorite_items')
        .delete()
        .eq('list_id', targetListId)
        .eq('photo_id', photoId);
      if (error) throw error;
    }
  },

  /**
   * Get favorite activity for a collection
   */
  async getFavoriteActivity(collectionId) {
    try {
      console.log('Fetching favorite activity for collection:', collectionId);
      // 1. Fetch lists
      const { data: lists, error: listsError } = await supabase
        .from('favorite_lists')
        .select('id, name, session_id, collection_id, created_at, max_selection, description, submitted_at')
        .eq('collection_id', collectionId);

      if (listsError) {
        console.error('Error fetching favorite lists:', listsError);
        throw listsError;
      }

      if (!lists || lists.length === 0) {
        console.log('No favorite lists found.');
        return [];
      }

      // 2. Fetch sessions
      const sessionIds = [...new Set(lists.map(l => l.session_id))];
      const { data: sessions, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('id, visitor_email')
        .in('id', sessionIds);

      if (sessionsError) {
        console.warn('Error fetching client sessions for activity:', sessionsError);
      }

      const sessionMap = (sessions || []).reduce((acc, s) => ({ ...acc, [s.id]: s.visitor_email }), {});

      // 3. Fetch item counts and thumbnails
      const listIds = lists.map(l => l.id);
      const { data: items, error: itemsError } = await supabase
        .from('favorite_items')
        .select(`
          id, 
          list_id,
          created_at,
          photo:photos(thumbnail_url, web_url, filename)
        `)
        .in('list_id', listIds);

      if (itemsError) {
        console.warn('Error fetching favorite items for activity:', itemsError);
      }

      const countMap = {};
      const thumbMap = {};
      const updatedMap = {};

      (items || []).forEach(item => {
        countMap[item.list_id] = (countMap[item.list_id] || 0) + 1;
        
        // Use the latest item creation date as the updated_at for the list
        if (!thumbMap[item.list_id] && item.photo) {
          thumbMap[item.list_id] = item.photo.thumbnail_url || item.photo.web_url;
        }
        
        const itemDate = new Date(item.created_at);
        if (!updatedMap[item.list_id] || itemDate > updatedMap[item.list_id]) {
          updatedMap[item.list_id] = itemDate;
        }
      });

      const results = lists.map(list => ({
        id: list.id,
        name: list.name,
        email: sessionMap[list.session_id] || 'Unknown visitor',
        photoCount: countMap[list.id] || 0,
        max_selection: list.max_selection ?? null,
        description: list.description ?? null,
        thumbnail: thumbMap[list.id] || null,
        created_at: list.created_at,
        updated_at: updatedMap[list.id] || list.created_at,
        submitted_at: list.submitted_at ?? null,
        sessionId: list.session_id
      }));

      console.log('Aggregated favorite activity:', results);
      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error in getFavoriteActivity:', error);
      return [];
    }
  },

  /**
   * Get all photos for a favorite list
   */
  async getFavoriteListPhotos(listId) {
    const { data, error } = await supabase
      .from('favorite_items')
      .select('photo:photos(*)')
      .eq('list_id', listId);

    if (error) throw error;
    return data.map(item => {
      if (Array.isArray(item.photo)) return item.photo[0];
      return item.photo;
    }).filter(p => !!p);
  },

  /**
   * Favorite list rows with item timestamps (dashboard detail panel).
   */
  async getFavoriteListItemRows(listId) {
    if (!listId) return [];
    const { data, error } = await supabase
      .from('favorite_items')
      .select(`
        created_at,
        photo:photos(*)
      `)
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((item) => {
      const photo = Array.isArray(item.photo) ? item.photo[0] : item.photo;
      return {
        itemCreatedAt: item.created_at,
        photo: photo || null,
      };
    }).filter((row) => !!row.photo);
  },

  /**
   * Visitor's favorite lists for the favorites hub (/gallery/:slug/f).
   */
  async getFavoriteListsForSession(sessionId) {
    if (!sessionId) return [];
    const { data: lists, error } = await supabase
      .from('favorite_lists')
      .select('id, name, created_at, max_selection, description, submitted_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!lists?.length) return [];

    const listIds = lists.map((l) => l.id);
    const { data: items, error: itemsError } = await supabase
      .from('favorite_items')
      .select('list_id, photo:photos(thumbnail_url, web_url)')
      .in('list_id', listIds);

    if (itemsError) {
      console.warn('getFavoriteListsForSession items:', itemsError);
      return lists.map((l) => ({ ...l, photoCount: 0, coverUrl: null }));
    }

    const countByList = {};
    const coverByList = {};
    (items || []).forEach((it) => {
      const lid = it.list_id;
      countByList[lid] = (countByList[lid] || 0) + 1;
      if (!coverByList[lid] && it.photo) {
        const ph = Array.isArray(it.photo) ? it.photo[0] : it.photo;
        coverByList[lid] = ph?.thumbnail_url || ph?.web_url || null;
      }
    });

    return lists.map((l) => ({
      ...l,
      photoCount: countByList[l.id] || 0,
      coverUrl: coverByList[l.id] || null,
      max_selection: l.max_selection ?? null,
    }));
  },

  /**
   * Update a favorite list's metadata
   */
  async updateFavoriteList(listId, updateData) {
    const { data, error } = await supabase
      .from('favorite_lists')
      .update(updateData)
      .eq('id', listId)
      .select('id, name, collection_id, session_id');

    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) {
      throw new Error(
        'Could not save this list (nothing was returned after update). Run the latest Supabase migrations, or add RLS policies so the collection owner can SELECT and UPDATE favorite_lists.'
      );
    }
    if (rows.length > 1) {
      throw new Error('Unexpected multiple rows when updating a favorite list.');
    }
    return rows[0];
  },

  /**
   * Delete a favorite list and its items (collection owner only).
   * Uses RPC with SECURITY DEFINER so deletes succeed even when direct table DELETE is blocked by RLS.
   */
  async deleteFavoriteList(listId) {
    if (!listId) throw new Error('List id is required');

    const { data: deletedCount, error } = await supabase.rpc('delete_favorite_list_owned', {
      p_list_id: listId,
    });

    if (error) {
      const msg = error.message || '';
      if (/function .* does not exist|Could not find the function/i.test(msg)) {
        throw new Error(
          'Delete is not set up on the server yet. In Supabase → SQL Editor, run the file supabase/migrations/20260513130000_delete_favorite_list_rpc.sql (or push migrations), then try again.'
        );
      }
      throw error;
    }

    const n = Number(deletedCount);
    if (Number.isNaN(n) || n !== 1) {
      throw new Error(
        'This favorite list could not be deleted. Sign in as the account that owns this collection, or confirm the list still exists.'
      );
    }

    return true;
  },

  /**
   * Remove one photo from a favorite list (collection owner / dashboard).
   */
  async removePhotoFromFavoriteList(listId, photoId) {
    if (!listId || !photoId) throw new Error('List id and photo id are required');
    const { error } = await supabase
      .from('favorite_items')
      .delete()
      .eq('list_id', listId)
      .eq('photo_id', photoId);
    if (error) throw error;
    return true;
  },

  /**
   * Get download activity for a collection
   */
  async getDownloadActivity(collectionId) {
    try {
      console.log('Fetching download activity for collection:', collectionId);
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          id,
          event_type,
          visitor_email,
          created_at,
          metadata,
          resolution,
          photo:photos!activity_log_photo_id_fkey (
            id,
            filename,
            set_id
          )
        `)
        .eq('collection_id', collectionId)
        .eq('event_type', 'download')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        email: item.visitor_email || 'Unknown visitor',
        date: item.created_at,
        type: item.metadata?.type || (item.photo_id ? 'single' : 'gallery'),
        resolution: item.resolution || item.metadata?.resolution || 'Original',
        filename: item.photo?.filename || null,
        photoSetId: item.photo?.set_id || null,
        size: item.metadata?.size || null,
        pinUsed: item.metadata?.pinUsed || false,
        setName: item.metadata?.setName || null, // Let UI resolve if null
        pin: item.metadata?.pin || '---'
      }));
    } catch (error) {
      console.error('Error in getDownloadActivity:', error);
      return [];
    }
  },

  /**
   * Delete an activity log entry (collection owner only).
   * Uses RPC with SECURITY DEFINER so deletes persist under RLS.
   */
  async deleteActivity(activityId) {
    const id = Number(activityId);
    if (!Number.isFinite(id)) {
      throw new Error('Invalid activity id');
    }

    const { data: deletedCount, error } = await supabase.rpc('delete_activity_log_owned', {
      p_activity_id: id,
    });

    if (error) {
      const msg = error.message || '';
      if (/function .* does not exist|Could not find the function/i.test(msg)) {
        throw new Error(
          'Delete is not set up on the server yet. In Supabase → SQL Editor, run supabase/migrations/20260513140000_delete_activity_log_rpc.sql, then try again.'
        );
      }
      throw error;
    }

    const n = Number(deletedCount);
    if (Number.isNaN(n) || n !== 1) {
      throw new Error(
        'This activity row could not be deleted. Sign in as the account that owns this collection, or confirm the entry still exists.'
      );
    }

    return true;
  },

  /**
   * Log an activity event
   */
  async logActivity(collectionId, eventType, data = {}) {
    try {
      const { error } = await supabase
        .from('activity_log')
        .insert([{
          collection_id: collectionId,
          photographer_id: data.photographerId || null,
          event_type: eventType,
          visitor_email: data.email || null,
          photo_id: data.photoId || null,
          metadata: data.metadata || null
        }]);
      if (error) throw error;
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }
  },

  /**
   * Get the download count for a collection
   */
  async getDownloadCount(collectionId) {
    try {
      const { count, error } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collectionId)
        .eq('event_type', 'download');
      
      if (error) throw error;
      return count || 0;
    } catch (e) {
      console.error('Error getting download count:', e);
      return 0;
    }
  },

  /**
   * Get the number of times the download PIN has been successfully used
   */
  async getPinUsageCount(collectionId) {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('metadata')
        .eq('collection_id', collectionId)
        .eq('event_type', 'password_attempt');

      if (error) throw error;
      // Count only entries where metadata.success === true and type is download_pin
      const successCount = (data || []).filter(
        row => row.metadata?.success === true && row.metadata?.type === 'download_pin'
      ).length;
      return successCount;
    } catch (e) {
      console.error('Error getting PIN usage count:', e);
      return 0;
    }
  },

  /**
   * Get aggregate counts for different activity types (for Expiry Reminder modal)
   */
  async getActivityCounts(collectionId) {
    if (!collectionId) return { contacts: 0, downloaded: 0, registered: 0, favorited: 0, purchased: 0 };

    try {
      // 1. Registered (unique emails in client_sessions)
      const { data: registeredData, error: regError } = await supabase
        .from('client_sessions')
        .select('visitor_email', { count: 'exact', head: false })
        .eq('collection_id', collectionId);
      
      const registeredEmails = new Set((registeredData || []).map(s => s.visitor_email).filter(Boolean));
      const registeredCount = registeredEmails.size;

      // 2. Downloaded (unique emails in activity_log with type 'download')
      const { data: downloadData, error: dlError } = await supabase
        .from('activity_log')
        .select('visitor_email')
        .eq('collection_id', collectionId)
        .eq('event_type', 'download');
      
      const downloadedEmails = new Set((downloadData || []).map(a => a.visitor_email).filter(Boolean));
      const downloadedCount = downloadedEmails.size;

      // 3. Favorited (unique emails who have favorite items)
      // This is a bit more complex, we'll fetch favorite_lists then check items
      const { data: favoriteLists, error: favError } = await supabase
        .from('favorite_lists')
        .select('id, session_id')
        .eq('collection_id', collectionId);

      let favoritedCount = 0;
      if (favoriteLists && favoriteLists.length > 0) {
        const listIds = favoriteLists.map(l => l.id);
        const { data: favItems } = await supabase
          .from('favorite_items')
          .select('list_id')
          .in('list_id', listIds);
        
        const listsWithItems = new Set((favItems || []).map(i => i.list_id));
        const favoritedSessionIds = new Set(
          favoriteLists
            .filter(l => listsWithItems.has(l.id))
            .map(l => l.session_id)
        );
        
        // Map session IDs back to unique emails
        const favoritedEmails = new Set(
          (registeredData || [])
            .filter(s => favoritedSessionIds.has(s.id))
            .map(s => s.visitor_email)
            .filter(Boolean)
        );
        favoritedCount = favoritedEmails.size;
      }

      return {
        contacts: registeredCount, // For now, contacts = registered
        downloaded: downloadedCount,
        registered: registeredCount,
        favorited: favoritedCount,
        purchased: 0 // Not implemented yet
      };
    } catch (err) {
      console.error('Error fetching activity counts:', err);
      return { contacts: 0, downloaded: 0, registered: 0, favorited: 0, purchased: 0 };
    }
  },

  /**
   * Fetch all expiry reminders for a collection
   */
  async getCollectionReminders(collectionId) {
    const { data, error } = await supabase
      .from('collection_reminders')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Create a new expiry reminder
   */
  async createCollectionReminder(reminderData) {
    const { data, error } = await supabase
      .from('collection_reminders')
      .insert([reminderData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing expiry reminder
   */
  async updateCollectionReminder(id, updateData) {
    const { data, error } = await supabase
      .from('collection_reminders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an expiry reminder
   */
  async deleteCollectionReminder(id) {
    const { error } = await supabase
      .from('collection_reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Send a gallery share email from one visitor to another (public share modal).
   */
  async shareCollectionByEmail({ collectionSlug, recipientEmail, senderEmail, personalMessage }) {
    const { data, error } = await supabase.functions.invoke('share-collection-email', {
      body: {
        collectionSlug,
        recipientEmail,
        senderEmail,
        personalMessage,
      },
    });

    if (error) {
      throw new Error(error.message || 'Could not send email');
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  },

  /**
   * Email history for photographer dashboard (visitor share emails).
   */
  async getCollectionShareEmailHistory(collectionId) {
    const { data, error } = await supabase
      .from('collection_share_emails')
      .select('id, sender_email, recipient_email, subject, status, created_at')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data ?? [];
  },
};
