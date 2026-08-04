import { supabase } from '../lib/supabase/client';
import { getImageDimensionsFast } from '../lib/imageDimensions';
import { getFileMime, isVideoMime, getUploadMediaType } from '../lib/fileMime';
import { compressImageForUpload, compressImageVariants } from '../lib/prepareUploadFile';
import { isRawImageFile } from '../lib/rawImageFormats';
import { extractRawPreviewBlob } from '../lib/rawImagePreview';
import { hasRawDisplayPreview, isRawMedia, resolveMediaUrl, toThumbDerivativeUrl } from '../lib/photoDisplayUrl';
import { generateCollectionSlug } from '../lib/collectionSlug';
import { DELIVERY_R2_MODULE } from '../lib/deliveryIds';
import { storageService } from './storage.service';
import {
  isIncompleteUploadPhoto,
  resolveOriginalStoragePath,
} from '../components/features/CollectionDashboard/Upload/uploadUtils';
import {
  appendFocalToCoverUrl,
  isMissingDbColumnError,
  isNumericOverflowError,
  normalizeFocalForDb,
  normalizeFocalPercent,
} from '../lib/focalPoint.js';

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
  web_storage_path,
  thumbnail_storage_path,
  size_bytes,
  photographer_id,
  created_at,
  watermarked_url,
  watermarked_storage_path
`.replace(/\s+/g, '');

const PHOTO_STORAGE_PATH_COLUMNS = [
  'original_storage_path',
  'thumbnail_storage_path',
  'web_storage_path',
  'watermarked_storage_path',
];

const collectionPathNameCache = new Map();
const photographerPathNameCache = new Map();

function safePathSegment(value, fallback = 'item') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || fallback;
}

async function getCollectionPathFolder(collectionId) {
  if (!collectionId) return 'delivery';
  if (collectionPathNameCache.has(collectionId)) {
    return collectionPathNameCache.get(collectionId);
  }
  try {
    const { data } = await supabase
      .from('deliveries')
      .select('id, name')
      .eq('id', collectionId)
      .maybeSingle();
    const folder = `${safePathSegment(data?.name, 'delivery')}__${collectionId}`;
    collectionPathNameCache.set(collectionId, folder);
    return folder;
  } catch {
    return `delivery__${collectionId}`;
  }
}

async function getPhotographerPathFolder(photographerId) {
  if (!photographerId) return 'photographer';
  if (photographerPathNameCache.has(photographerId)) {
    return photographerPathNameCache.get(photographerId);
  }
  try {
    const { data } = await supabase
      .from('photographers')
      .select('id, display_name, email')
      .eq('id', photographerId)
      .maybeSingle();
    const emailPrefix = String(data?.email || '').split('@')[0];
    const folder = safePathSegment(data?.display_name || emailPrefix || photographerId, 'photographer');
    photographerPathNameCache.set(photographerId, folder);
    return folder;
  } catch {
    return safePathSegment(photographerId, 'photographer');
  }
}

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

/** Dashboard list row: storage totals + filenames for client-gallery search. */
function mapCollectionDashboardRow(c) {
  const photoRows = c.photos || [];
  const storage_bytes = photoRows.reduce((sum, p) => sum + (Number(p.size_bytes) || 0), 0);
  const storedTotal = Number(c.total_size_bytes);
  const photo_filenames = photoRows
    .map((p) => p.filename)
    .filter((name) => typeof name === 'string' && name.length > 0);
  const { photos, ...rest } = c;
  return {
    ...rest,
    photo_count: rest.photo_count ?? photoRows.length,
    photo_filenames,
    storage_bytes:
      Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : storage_bytes,
  };
}

/**
 * For list cards with no cover_url, attach the earliest photo's thumb URL
 * so the Client Gallery grid still shows an image.
 */
async function attachMissingListCovers(collections) {
  if (!Array.isArray(collections) || collections.length === 0) return collections;

  const missing = collections.filter((c) => !c.cover_url && !c.cover && c.photo_count > 0);
  if (missing.length === 0) return collections;

  const pairs = await Promise.all(
    missing.map(async (c) => {
      const { data, error } = await supabase
        .from('photos')
        .select('thumbnail_url, web_url, full_url')
        .eq('collection_id', c.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error || !data) return [c.id, null];
      const url = toThumbDerivativeUrl(data.thumbnail_url || data.web_url || data.full_url || '');
      return [c.id, url || null];
    })
  );

  const firstByCollection = Object.fromEntries(pairs.filter(([, url]) => url));

  return collections.map((c) => {
    if (c.cover_url || c.cover) return c;
    const fallback = firstByCollection[c.id];
    if (!fallback) return c;
    return { ...c, list_cover_url: fallback };
  });
}

export const galleryService = {
  /**
   * Fetch all collections for a specific photographer (Dashboard view)
   */
  async getCollections(photographerId) {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(size_bytes, filename)
      `)
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const mapped = data ? data.map(mapCollectionDashboardRow) : [];
    return attachMissingListCovers(mapped);
  },

  /**
   * Fetch published collections for a public homepage
   */
  async getPublicCollections(photographerId) {
    if (!photographerId) return [];
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('photographer_id', photographerId)
      .eq('status', 'published')
      .neq('show_on_homepage', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /** Starred collections for the dashboard Starred page. */
  async getStarredCollections(photographerId) {
    if (!photographerId) return [];
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(size_bytes, filename)
      `)
      .eq('photographer_id', photographerId)
      .eq('is_starred', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return attachMissingListCovers((data || []).map(mapCollectionDashboardRow));
  },

  /** Starred photos across all deliveries for the dashboard Starred → Photos tab. */
  async getStarredPhotos(photographerId) {
    if (!photographerId) return [];
    const { data, error } = await supabase
      .from('photos')
      .select(`
        ${DASHBOARD_PHOTO_FIELDS},
        collection:deliveries!photos_collection_id_fkey(id, name, slug)
      `)
      .eq('photographer_id', photographerId)
      .eq('is_starred', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => {
      const collection = Array.isArray(row.collection) ? row.collection[0] : row.collection;
      return { ...row, collection: collection || null };
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
      .from('deliveries')
      .select('folder_id, cover_url, created_at')
      .eq('photographer_id', photographerId)
      .not('folder_id', 'is', null)
      .order('created_at', { ascending: true });

    if (collectionError) throw collectionError;

    const coversByFolder = {};
    const sorted = [...(collections || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    for (const row of sorted) {
      if (!row.folder_id || !row.cover_url) continue;
      if (!coversByFolder[row.folder_id]) coversByFolder[row.folder_id] = [];
      if (coversByFolder[row.folder_id].length < 4) coversByFolder[row.folder_id].push(row.cover_url);
    }

    return (folders || []).map((folder) => {
      const childCovers = coversByFolder[folder.id] || [];
      const preview_urls = folder.cover_url
        ? [folder.cover_url, ...childCovers.filter((u) => u !== folder.cover_url)].slice(0, 4)
        : childCovers.slice(0, 4);
      return {
        id: folder.id,
        name: folder.name,
        cover_url: folder.cover_url || childCovers[0] || null,
        preview_urls,
      };
    });
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
      throw new Error('Delivery is required.');
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update({ folder_id: folderId ?? null })
      .eq('id', collectionId)
      .select('id, folder_id')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Folders for the client gallery grid (with collection counts).
   */
  async listFoldersForGallery(photographerId) {
    if (!photographerId) return [];

    const { data: folders, error } = await supabase
      .from('folders')
      .select('id, name, slug, cover_url, position, created_at, event_date, show_on_homepage')
      .eq('photographer_id', photographerId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const collections = await this.getCollections(photographerId);
    const countBy = {};
    const coversByFolder = {};
    const inFolder = [...collections]
      .filter((c) => c.folder_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    for (const c of inFolder) {
      if (!c.folder_id) continue;
      countBy[c.folder_id] = (countBy[c.folder_id] || 0) + 1;
      const thumb = c.cover_url || c.cover || c.list_cover_url;
      if (!thumb) continue;
      if (!coversByFolder[c.folder_id]) coversByFolder[c.folder_id] = [];
      if (coversByFolder[c.folder_id].length < 4) coversByFolder[c.folder_id].push(thumb);
    }

    return (folders || []).map((f) => {
      const childCovers = coversByFolder[f.id] || [];
      const preview_urls = f.cover_url
        ? [f.cover_url, ...childCovers.filter((u) => u !== f.cover_url)].slice(0, 4)
        : childCovers.slice(0, 4);
      return {
        ...f,
        collection_count: countBy[f.id] || 0,
        preview_urls,
        cover_url: f.cover_url || childCovers[0] || null,
      };
    });
  },

  async getFolderById(folderId, photographerId) {
    if (!folderId || !photographerId) return null;
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .eq('photographer_id', photographerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /** Collections inside a folder (same shape as getCollections rows). */
  async getCollectionsForFolder(photographerId, folderId) {
    if (!photographerId || !folderId) return [];

    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(size_bytes, filename)
      `)
      .eq('photographer_id', photographerId)
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return attachMissingListCovers((data || []).map(mapCollectionDashboardRow));
  },

  async updateFolder(folderId, photographerId, updates) {
    if (!folderId || !photographerId) {
      throw new Error('Folder and photographer are required.');
    }

    const patch = {};
    if (updates.name !== undefined) patch.name = String(updates.name).trim();
    if (updates.event_date !== undefined) patch.event_date = updates.event_date || null;
    if (updates.show_on_homepage !== undefined) patch.show_on_homepage = !!updates.show_on_homepage;
    if (updates.cover_url !== undefined) patch.cover_url = updates.cover_url;
    if (updates.guest_password_hash !== undefined) patch.guest_password_hash = updates.guest_password_hash;

    if (Object.keys(patch).length === 0) {
      return this.getFolderById(folderId, photographerId);
    }

    const { data, error } = await supabase
      .from('folders')
      .update(patch)
      .eq('id', folderId)
      .eq('photographer_id', photographerId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFolder(folderId, photographerId) {
    if (!folderId || !photographerId) {
      throw new Error('Folder is required.');
    }
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('photographer_id', photographerId);

    if (error) throw error;
  },

  /**
   * Fetch all published collections for a specific photographer (Public view)
   */
  async getPublicCollections(photographerId) {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        photos:photos!photos_collection_id_fkey(count)
      `)
      .eq('photographer_id', photographerId)
      .eq('status', 'published')
      .neq('show_on_homepage', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(c => ({
      ...c,
      photo_count: c.photos?.[0]?.count || 0
    }));
  },

  /**
   * Create a new delivery
   */
  async createCollection(collectionData) {
    if (collectionData.photographer_id) {
      try {
        const { data: existingPhotographer } = await supabase
          .from('photographers')
          .select('id')
          .eq('id', collectionData.photographer_id)
          .maybeSingle();

        if (!existingPhotographer) {
          const { data: { user } } = await supabase.auth.getUser();
          const email = user?.email || 'photographer@pixnxt.in';
          const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name || email.split('@')[0] || 'Photographer';
          await supabase
            .from('photographers')
            .insert([{
              id: collectionData.photographer_id,
              email: email,
              display_name: name
            }]);
        }
      } catch (err) {
        console.error('Error ensuring photographer profile exists:', err);
      }
    }

    let finalCollectionData = { ...collectionData };
    if (typeof window !== 'undefined') {
      const storedEnabled = localStorage.getItem('pixnxt_global_digital_enabled');
      const storedSingle = localStorage.getItem('pixnxt_global_digital_price_single');
      const storedAll = localStorage.getItem('pixnxt_global_digital_price_all');

      if (storedEnabled !== null) {
        finalCollectionData.digital_download_enabled = storedEnabled === 'true';
      }
      if (storedSingle !== null) {
        finalCollectionData.digital_download_price_single = parseInt(storedSingle);
      }
      if (storedAll !== null) {
        finalCollectionData.digital_download_price_all = parseInt(storedAll);
      }

      // Vault settings
      const storedVaultEnabled = localStorage.getItem('pixnxt_global_vault_enabled');
      const storedVault1Month = localStorage.getItem('pixnxt_global_vault_price_1month');
      const storedVault1Year = localStorage.getItem('pixnxt_global_vault_price_1year');
      const storedVaultLifetime = localStorage.getItem('pixnxt_global_vault_price_lifetime');
      const storedVaultDesc1Month = localStorage.getItem('pixnxt_global_vault_desc_1month');
      const storedVaultDesc1Year = localStorage.getItem('pixnxt_global_vault_desc_1year');
      const storedVaultDescLifetime = localStorage.getItem('pixnxt_global_vault_desc_lifetime');

      const vaultSettings = {};
      if (storedVaultEnabled !== null) {
        vaultSettings.vault_enabled = storedVaultEnabled === 'true';
      }
      if (storedVault1Month !== null) {
        vaultSettings.price_1month = parseInt(storedVault1Month);
      }
      if (storedVault1Year !== null) {
        vaultSettings.price_1year = parseInt(storedVault1Year);
      }
      if (storedVaultLifetime !== null) {
        vaultSettings.price_lifetime = parseInt(storedVaultLifetime);
      }
      if (storedVaultDesc1Month) {
        vaultSettings.desc_1month = storedVaultDesc1Month;
      }
      if (storedVaultDesc1Year) {
        vaultSettings.desc_1year = storedVaultDesc1Year;
      }
      if (storedVaultDescLifetime) {
        vaultSettings.desc_lifetime = storedVaultDescLifetime;
      }

      // Store in memory to insert post collection creation
      finalCollectionData._vaultSettings = vaultSettings;
    }

    // Strip temp field before insert
    const { _vaultSettings, ...insertPayload } = finalCollectionData;

    const { data, error } = await supabase
      .from('deliveries')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;

    // Create the vault extension plans record
    if (data?.id && _vaultSettings) {
      try {
        await supabase
          .from('vault_extension_plans')
          .insert([{
            collection_id: data.id,
            ..._vaultSettings
          }]);
      } catch (err) {
        console.error('Failed to auto-create vault settings record:', err);
      }
    }

    return data;
  },

  /**
   * Duplicate a collection: copies metadata, sets, and all media (photos + videos, same storage URLs).
   */
  async duplicateCollection(sourceCollectionId, photographerId) {
    if (!sourceCollectionId || !photographerId) {
      throw new Error('Delivery and photographer are required to duplicate.');
    }

    const source = await this.getCollectionById(sourceCollectionId);

    const newCollection = await this.createCollection({
      photographer_id: photographerId,
      folder_id: source.folder_id ?? null,
      name: `${source.name} (Copy)`,
      slug: `${generateCollectionSlug(source.name)}-copy-${Date.now().toString(36)}`,
      event_date: source.event_date ?? null,
      status: 'draft',
      description: source.description ?? null,
      category_tags: source.category_tags ?? [],
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

    const sourcePhotos = [...(source.photos || [])].sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    );

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
   * Save cover focal point. Uses cover_focal_x/y when present; falls back to #focal= on cover_url.
   */
  async saveCollectionFocalPoint(collectionId, coverUrl, focalX, focalY) {
    const fx = normalizeFocalForDb(focalX);
    const fy = normalizeFocalForDb(focalY);
    const newCoverUrl = appendFocalToCoverUrl(coverUrl, fx, fy);

    const fullPatch = {
      cover_url: newCoverUrl,
      cover_focal_x: fx,
      cover_focal_y: fy,
    };

    try {
      return await this.updateCollection(collectionId, fullPatch);
    } catch (err) {
      if (isMissingDbColumnError(err, 'cover_focal')) {
        console.warn(
          'cover_focal_x/y columns missing — saving focal in cover_url only. Run migration 20260521140000_collections_cover_focal.sql'
        );
        return await this.updateCollection(collectionId, { cover_url: newCoverUrl });
      }
      if (isNumericOverflowError(err)) {
        console.warn(
          'cover_focal_x/y numeric overflow — saving focal in cover_url only. Run migration 20260521140100_collections_cover_focal_fix_type.sql'
        );
        return await this.updateCollection(collectionId, { cover_url: newCoverUrl });
      }
      throw err;
    }
  },

  /**
   * Update an existing collection
   */
  async updateCollection(id, updateData) {
    const { data, error } = await supabase
      .from('deliveries')
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
    // 1. Delivery + photo storage keys (covers deliveries/ and legacy clientgallery/ paths)
    const { data: collection, error: fetchError } = await supabase
      .from('deliveries')
      .select(
        `photographer_id, photos:photos!photos_collection_id_fkey(${PHOTO_STORAGE_PATH_COLUMNS.join(', ')})`
      )
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete all derivative keys from R2 when present
    const storagePaths = (collection.photos || []).flatMap(collectPhotoStoragePaths);
    try {
      await deleteStoragePaths(storagePaths);
    } catch (storageError) {
      console.error('Error deleting storage files from R2:', storageError);
      // Continue so DB rows are still removed
    }

    // 3. Delete the delivery row (cascade deletes related DB tables)
    const { error } = await supabase
      .from('deliveries')
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
        .from('deliveries')
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
      .from('deliveries')
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
   * Fetch a single published collection by slug (public gallery / QR).
   */
  async getCollectionBySlug(slug) {
    const normalized = decodeURIComponent(String(slug || '').trim());
    if (!normalized) return null;

    const select = `
        *,
        photos!photos_collection_id_fkey (
          id,
          filename,
          set_id,
          web_url,
          thumbnail_url,
          full_url,
          original_storage_path,
          width,
          height,
          position,
          created_at,
          exif_taken_at,
          media_type,
          is_private,
          watermarked_url
        ),
        sets!sets_collection_id_fkey (
          id,
          name,
          description,
          position,
          photo_count,
          is_private
        )
      `;

    const baseQuery = () =>
      supabase
        .from('deliveries')
        .select(select)
        .eq('status', 'published');

    let { data, error } = await baseQuery().eq('slug', normalized).maybeSingle();

    if (!data && !error) {
      const fallback = await baseQuery().ilike('slug', normalized).maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    if (!data) return null;

    if (data.photos) {
      data.photos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    if (data.sets) {
      data.sets.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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

  async _assertStorageQuota(photographerId, fileSize) {
    let profile = null;
    try {
      if (
        globalThis.__pixnxtProfileCache &&
        globalThis.__pixnxtProfileCache.id === photographerId &&
        Date.now() - globalThis.__pixnxtProfileCache.time < 45000
      ) {
        profile = globalThis.__pixnxtProfileCache.data;
      } else {
        const { data } = await supabase
          .from('photographers')
          .select('storage_used_bytes, storage_limit_bytes, plan')
          .eq('id', photographerId)
          .single();
        profile = data;
        globalThis.__pixnxtProfileCache = { id: photographerId, data: profile, time: Date.now() };
      }
    } catch (_) {}

    if (!profile) return;

    const usedBytes = profile.storage_used_bytes || 0;
    let limitBytes = profile.storage_limit_bytes;

    if (!limitBytes) {
      const tier = String(profile.plan || '').toLowerCase();
      if (tier === 'pro') limitBytes = 100 * 1024 * 1024 * 1024;
      else if (tier === 'premium') limitBytes = 500 * 1024 * 1024 * 1024;
      else if (tier === 'free') limitBytes = 5 * 1024 * 1024 * 1024;
      else limitBytes = 10 * 1024 * 1024 * 1024;
    }

    if (usedBytes + fileSize > limitBytes) {
      const remainingBytes = Math.max(0, limitBytes - usedBytes);
      const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };
      throw new Error(
        `Storage limit exceeded. Remaining storage space: ${formatSize(remainingBytes)}. This file size is ${formatSize(fileSize)}.`
      );
    }
  },

  async _resolveUploadBasePath(photographerId, collectionId, setId) {
    if (!globalThis.__pixnxtFolderCache) globalThis.__pixnxtFolderCache = new Map();
    const pKey = `p_${photographerId}`;
    const cKey = `c_${collectionId}`;

    let photographerFolder = globalThis.__pixnxtFolderCache.get(pKey);
    let collectionFolder = globalThis.__pixnxtFolderCache.get(cKey);

    if (!photographerFolder || !collectionFolder) {
      const [pF, cF] = await Promise.all([
        photographerFolder || getPhotographerPathFolder(photographerId),
        collectionFolder || getCollectionPathFolder(collectionId),
      ]);
      photographerFolder = pF;
      collectionFolder = cF;
      globalThis.__pixnxtFolderCache.set(pKey, pF);
      globalThis.__pixnxtFolderCache.set(cKey, cF);
    }

    const setFolder = setId ? `set__${safePathSegment(setId, 'set')}` : 'highlights';
    return `users/${photographerFolder}/${DELIVERY_R2_MODULE}/${collectionFolder}/photoset/${setFolder}`;
  },

  /**
   * Phase 1: generate + upload web/thumb, insert DB row (grid can show immediately).
   * Returns context needed for Phase 2 original upload.
   */
  async uploadPhotoDerivatives(
    collectionId,
    photographerId,
    file,
    index = 0,
    setId = null,
    onProgress = null,
    onInserted = null,
    options = {}
  ) {
    const { signal } = options;
    if (!collectionId || !photographerId) {
      throw new Error('Delivery or photographer is missing. Refresh the page and try again.');
    }

    await this._assertStorageQuota(photographerId, file.size);

    const mime = getFileMime(file);
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const basePath = await this._resolveUploadBasePath(photographerId, collectionId, setId);
    const filePath = `${basePath}/original/${fileName}`;

    const isVideo = isVideoMime(mime);
    const isRaw = isRawImageFile(file);
    const mediaType = getUploadMediaType(file);

    let webFile = null;
    let thumbFile = null;
    let dimensions = { width: null, height: null };
    let thumbnailBlob = null;

    onProgress?.(5);

    if (!isVideo && !isRaw) {
      const [dim, variants] = await Promise.all([
        getImageDimensionsFast(file).catch(() => ({ width: null, height: null })),
        compressImageVariants(file, { webMaxEdge: 2048, thumbMaxEdge: 400, thumbQuality: 0.6 }).catch(
          () => ({ webFile: file, thumbFile: file })
        ),
      ]);
      dimensions = dim;
      webFile = variants.webFile;
      thumbFile = variants.thumbFile;
    } else if (isVideo) {
      const meta = await this._captureVideoThumbnail(file).catch(() => ({
        dimensions: { width: null, height: null },
        thumbnailBlob: null,
      }));
      dimensions = meta.dimensions;
      thumbnailBlob = meta.thumbnailBlob;
    } else if (isRaw) {
      const meta = await this._captureRawPreview(file).catch(() => ({
        dimensions: { width: null, height: null },
        thumbnailBlob: null,
      }));
      dimensions = meta.dimensions;
      thumbnailBlob = meta.thumbnailBlob;
      if (thumbnailBlob) {
        const previewFile = new File([thumbnailBlob], 'preview.jpg', { type: 'image/jpeg' });
        const variants = await compressImageVariants(previewFile, {
          webMaxEdge: 2048,
          thumbMaxEdge: 400,
          thumbQuality: 0.6,
        }).catch(() => ({ webFile: previewFile, thumbFile: previewFile }));
        webFile = variants.webFile;
        thumbFile = variants.thumbFile;
      }
    }

    onProgress?.(20);

    const fileNameJpg = fileName.replace(/\.[^.]+$/, '.jpg');
    const webPath = `${basePath}/web/${fileNameJpg}`;
    const thumbnailPath = `${basePath}/thumb/${fileNameJpg}`;

    let webStoragePath = null;
    let thumbnailStoragePath = null;

    const prepPromises = [];
    if (webFile) {
      webStoragePath = webPath;
      prepPromises.push(
        storageService.upload(webStoragePath, webFile, (p) => {
          onProgress?.(20 + Math.round((p / 100) * 40));
        }, signal)
      );
    }
    if (thumbFile) {
      thumbnailStoragePath = thumbnailPath;
      prepPromises.push(
        storageService.upload(thumbnailStoragePath, thumbFile, (p) => {
          onProgress?.(60 + Math.round((p / 100) * 35));
        }, signal)
      );
    }

    const prepResults = await Promise.all(prepPromises);

    let webUrl = null;
    let thumbUrl = null;
    if (isRaw || !isVideo) {
      webUrl = webFile ? prepResults[0]?.url : null;
      thumbUrl = thumbFile ? prepResults[webFile ? 1 : 0]?.url : null;
    }

    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert([
        {
          collection_id: collectionId,
          photographer_id: photographerId,
          set_id: setId,
          filename: file.name,
          full_url: null,
          web_url: webUrl,
          thumbnail_url: thumbUrl,
          original_storage_path: null,
          web_storage_path: webStoragePath,
          thumbnail_storage_path: thumbnailStoragePath,
          size_bytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          media_type: mediaType,
          position: index,
          status: 'ready',
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    if (onInserted) {
      onInserted(photoData);
    }

    onProgress?.(100);

    return {
      photoData,
      uploadContext: {
        collectionId,
        photoId: photoData.id,
        file,
        mime,
        filePath,
        basePath,
        fileNameJpg,
        isVideo,
        isRaw,
        thumbnailBlob,
      },
    };
  },

  /**
   * Look up existing photo rows by filename (live DB — not React state).
   * Prefers the active set, then incomplete rows on filename collision.
   */
  async findPhotosByFilenames(collectionId, filenames, preferredSetId = null) {
    if (!collectionId || !filenames?.length) return [];

    const unique = [...new Set(filenames.filter(Boolean))];
    const { data, error } = await supabase
      .from('photos')
      .select(DASHBOARD_PHOTO_FIELDS)
      .eq('collection_id', collectionId)
      .in('filename', unique);

    if (error) throw error;

    const byName = new Map();
    for (const photo of data || []) {
      if (!photo?.filename) continue;
      const key = String(photo.filename).toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, photo);
        continue;
      }
      if (
        preferredSetId &&
        photo.set_id === preferredSetId &&
        existing.set_id !== preferredSetId
      ) {
        byName.set(key, photo);
        continue;
      }
      if (isIncompleteUploadPhoto(photo) && !isIncompleteUploadPhoto(existing)) {
        byName.set(key, photo);
      }
    }

    return [...byName.values()];
  },

  /** True when the original object is absent from R2 (safe to resume original upload). */
  async isOriginalMissingInR2(photo, fileExt = null) {
    const path = resolveOriginalStoragePath(photo, fileExt);
    if (!path) return true;
    return !(await storageService.exists(path));
  },

  /**
   * Build Phase-2 context for a photo that already has web/thumb but never got an original.
   * Reuses the same storage stem as web/thumb when available.
   */
  buildResumeOriginalContext(photo, file) {
    if (!photo?.id || !file) {
      throw new Error('Cannot resume upload — photo or file is missing.');
    }

    const mime = getFileMime(file);
    const isVideo = isVideoMime(mime);
    const isRaw = isRawImageFile(file);
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();

    const filePath = resolveOriginalStoragePath(photo, fileExt);
    if (!filePath) {
      throw new Error(
        'Cannot resume upload — missing web/thumb storage path. Delete the incomplete photo and re-upload.'
      );
    }

    const basePath = filePath.replace(/\/original\/[^/]+$/, '');
    const stem = filePath
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '');
    const fileNameJpg = `${stem}.jpg`;

    return {
      collectionId: photo.collection_id,
      photoId: photo.id,
      file,
      mime,
      filePath,
      basePath,
      fileNameJpg,
      isVideo,
      isRaw,
      thumbnailBlob: null,
      resumed: true,
    };
  },

  /**
   * Phase 2: upload original full-res file and finalize DB row.
   */
  async uploadPhotoOriginal(uploadContext, onProgress = null, options = {}) {
    const { signal } = options;
    const {
      collectionId,
      photoId,
      file,
      mime,
      filePath,
      basePath,
      fileNameJpg,
      isVideo,
      isRaw,
      thumbnailBlob,
    } = uploadContext;

    let originalFile = file;
    const uploadQuality = localStorage.getItem('upload_quality') || 'original';
    if (!isVideo && !isRaw && uploadQuality !== 'original') {
      const edge = uploadQuality === 'high' ? 3600 : 2048;
      originalFile = await compressImageForUpload(file, { maxEdge: edge }).catch(() => file);
    }

    const uploadBody =
      originalFile.type === mime
        ? originalFile
        : new File([originalFile], originalFile.name, {
            type: mime,
            lastModified: originalFile.lastModified,
          });

    const uploadResult = await storageService.upload(filePath, uploadBody, onProgress, signal);

    const { data: finalPhoto } = await supabase
      .from('photos')
      .update({
        full_url: uploadResult.url,
        original_storage_path: filePath,
      })
      .eq('id', photoId)
      .select()
      .single();

    if (typeof window !== 'undefined' && photoId) {
      void import('./photoAiUploadPipeline.js').then(({ queuePhotoAiIndex }) =>
        queuePhotoAiIndex(collectionId, photoId)
      );
    }

    if (isVideo && thumbnailBlob) {
      const thumbnailPathVideo = `${basePath}/thumb/${fileNameJpg}`;
      void storageService
        .upload(thumbnailPathVideo, thumbnailBlob)
        .then(({ url: thumbUrl }) =>
          supabase
            .from('photos')
            .update({ thumbnail_url: thumbUrl, thumbnail_storage_path: thumbnailPathVideo })
            .eq('id', photoId)
        )
        .catch((err) => console.warn('Video thumbnail upload deferred failed:', err));
    }

    return finalPhoto || { id: photoId, full_url: uploadResult.url, original_storage_path: filePath };
  },

  /**
   * Upload a single photo to R2 and record in database.
   * Prefer two-phase queue (derivatives then originals) for batch uploads.
   * @param {(percent: number) => void} [onProgress] — 0–100 based on bytes sent to R2
   */
  async uploadPhoto(
    collectionId,
    photographerId,
    file,
    index = 0,
    setId = null,
    onProgress = null,
    onInserted = null
  ) {
    const { photoData, uploadContext } = await this.uploadPhotoDerivatives(
      collectionId,
      photographerId,
      file,
      index,
      setId,
      (p) => onProgress?.(Math.round((p / 100) * 20)),
      onInserted
    );

    const finalPhoto = await this.uploadPhotoOriginal(uploadContext, (p) =>
      onProgress?.(20 + Math.round((p / 100) * 80))
    );

    return finalPhoto || photoData;
  },

  async _captureRawPreview(file) {
    const thumbnailBlob = await extractRawPreviewBlob(file);
    if (!thumbnailBlob) {
      console.warn('No embedded JPEG preview found in RAW file:', file?.name);
      return { dimensions: { width: null, height: null }, thumbnailBlob: null };
    }
    const previewFile = new File([thumbnailBlob], 'preview.jpg', { type: 'image/jpeg' });
    const dimensions = await getImageDimensionsFast(previewFile);
    return { dimensions, thumbnailBlob };
  },

  async _uploadRawPreviewJpeg(rawStoragePath, thumbnailBlob) {
    const previewPath = rawStoragePath.replace(/\.[^.]+$/, '_preview.jpg');
    const previewFile = new File([thumbnailBlob], 'preview.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    return storageService.upload(previewPath, previewFile);
  },

  /**
   * Build JPEG preview URLs for RAW rows uploaded before preview extraction existed.
   */
  async repairRawPhotoPreview(photo, { rebake = false } = {}) {
    if (!photo?.id || !isRawMedia(photo)) {
      return photo;
    }
    if (!rebake && hasRawDisplayPreview(photo)) {
      return photo;
    }

    const storagePath = photo.original_storage_path;
    const rawUrl = resolveMediaUrl(photo.full_url);
    if (!storagePath || !rawUrl) return photo;

    const res = await fetch(rawUrl);
    if (!res.ok) {
      throw new Error(`Could not fetch RAW file (${res.status})`);
    }

    const blob = await res.blob();
    const file = new File([blob], photo.filename || 'photo.raw', {
      type: blob.type || 'application/octet-stream',
      lastModified: Date.now(),
    });
    const meta = await this._captureRawPreview(file);
    const previewBlob = meta.thumbnailBlob;
    if (!previewBlob) return photo;

    const { url: previewUrl } = await this._uploadRawPreviewJpeg(storagePath, previewBlob);
    const dimensions = meta.dimensions ?? { width: null, height: null };

    const { data, error } = await supabase
      .from('photos')
      .update({
        web_url: previewUrl,
        thumbnail_url: previewUrl,
        width: dimensions.width,
        height: dimensions.height,
      })
      .eq('id', photo.id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
      throw new Error('Delivery or photographer is missing. Refresh the page and try again.');
    }

    const { data: existing, error: fetchError } = await supabase
      .from('photos')
      .select(
        `id, collection_id, set_id, ${PHOTO_STORAGE_PATH_COLUMNS.join(', ')}`
      )
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;
    if (!existing || existing.collection_id !== collectionId) {
      throw new Error('Photo not found in this delivery.');
    }

    const mime = getFileMime(file);
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const [photographerFolder, collectionFolder] = await Promise.all([
      getPhotographerPathFolder(photographerId),
      getCollectionPathFolder(collectionId),
    ]);
    const setFolder = existing?.set_id
      ? `set__${safePathSegment(existing.set_id, 'set')}`
      : 'highlights';
    const basePath = `users/${photographerFolder}/${DELIVERY_R2_MODULE}/${collectionFolder}/photoset/${setFolder}`;
    const filePath = `${basePath}/original/${fileName}`;

    const isVideo = isVideoMime(mime);
    const isRaw = isRawImageFile(file);
    const mediaType = getUploadMediaType(file);

    let webFile = null;
    let thumbFile = null;
    let dimensions = { width: null, height: null };
    let thumbnailBlob = null;

    if (!isVideo && !isRaw) {
      const [dim, variants] = await Promise.all([
        getImageDimensionsFast(file).catch(() => ({ width: null, height: null })),
        compressImageVariants(file, { webMaxEdge: 2048, thumbMaxEdge: 400, thumbQuality: 0.6 }).catch(
          () => ({ webFile: file, thumbFile: file })
        ),
      ]);
      dimensions = dim;
      webFile = variants.webFile;
      thumbFile = variants.thumbFile;
    } else if (isVideo) {
      const meta = await this._captureVideoThumbnail(file).catch(() => ({ dimensions: { width: null, height: null }, thumbnailBlob: null }));
      dimensions = meta.dimensions;
      thumbnailBlob = meta.thumbnailBlob;
    } else if (isRaw) {
      const meta = await this._captureRawPreview(file).catch(() => ({ dimensions: { width: null, height: null }, thumbnailBlob: null }));
      dimensions = meta.dimensions;
      thumbnailBlob = meta.thumbnailBlob;
      if (thumbnailBlob) {
        const previewFile = new File([thumbnailBlob], 'preview.jpg', { type: 'image/jpeg' });
        const variants = await compressImageVariants(previewFile, {
          webMaxEdge: 2048,
          thumbMaxEdge: 400,
          thumbQuality: 0.6,
        }).catch(() => ({ webFile: previewFile, thumbFile: previewFile }));
        webFile = variants.webFile;
        thumbFile = variants.thumbFile;
      }
    }

    const fileNameJpg = fileName.replace(/\.[^.]+$/, '.jpg');
    const webPath = `${basePath}/web/${fileNameJpg}`;
    const thumbnailPath = `${basePath}/thumb/${fileNameJpg}`;

    let webStoragePath = null;
    let thumbnailStoragePath = null;

    let originalFile = file;
    const uploadQuality = localStorage.getItem('upload_quality') || 'original';
    if (!isVideo && !isRaw && uploadQuality !== 'original') {
      const edge = uploadQuality === 'high' ? 3600 : 2048;
      originalFile = await compressImageForUpload(file, { maxEdge: edge }).catch(() => file);
    }

    const uploadBody =
      originalFile.type === mime
        ? originalFile
        : new File([originalFile], originalFile.name, { type: mime, lastModified: originalFile.lastModified });

    const uploadPromises = [];
    uploadPromises.push(storageService.upload(filePath, uploadBody, onProgress));

    if (webFile) {
      webStoragePath = webPath;
      uploadPromises.push(storageService.upload(webStoragePath, webFile));
    }

    if (thumbFile) {
      thumbnailStoragePath = thumbnailPath;
      uploadPromises.push(storageService.upload(thumbnailStoragePath, thumbFile));
    }

    const uploadResults = await Promise.all(uploadPromises);
    const publicUrl = uploadResults[0].url;
    let webUrl = publicUrl;
    let thumbUrl = publicUrl;

    if (isRaw) {
      webUrl = webFile ? uploadResults[1]?.url : null;
      thumbUrl = thumbFile ? uploadResults[2]?.url : null;
    } else if (!isVideo) {
      webUrl = webFile ? uploadResults[1]?.url : publicUrl;
      thumbUrl = thumbFile ? uploadResults[2]?.url : publicUrl;
    }

    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .update({
        filename: file.name,
        full_url: publicUrl,
        web_url: webUrl,
        thumbnail_url: thumbUrl,
        original_storage_path: filePath,
        web_storage_path: webStoragePath,
        thumbnail_storage_path: thumbnailStoragePath,
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
      const thumbnailPathVideo = `${basePath}/thumb/${fileNameJpg}`;
      void storageService.upload(thumbnailPathVideo, thumbnailBlob).then(({ url: thumbUrl }) =>
        supabase.from('photos').update({ thumbnail_url: thumbUrl, thumbnail_storage_path: thumbnailPathVideo }).eq('id', photoId)
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
        .from('deliveries')
        .select('cover_photo_id')
        .eq('id', collectionId)
        .single();

      if (coverError) throw coverError;

      if (collection?.cover_photo_id && ids.includes(collection.cover_photo_id)) {
        const { error: clearCoverError } = await supabase
          .from('deliveries')
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

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data;
  },

  /**
   * Fetch all watermarks for a photographer
   */
  async getWatermarks(photographerId) {
    const { data, error } = await supabase
      .from('watermarks')
      .select('*')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch a single watermark by ID
   */
  async getWatermark(id) {
    const { data, error } = await supabase
      .from('watermarks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Create a new watermark
   */
  async createWatermark(watermarkData) {
    const { data, error } = await supabase
      .from('watermarks')
      .insert([watermarkData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing watermark
   */
  async updateWatermark(id, updates) {
    const { data, error } = await supabase
      .from('watermarks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a watermark
   */
  async deleteWatermark(id) {
    const { error } = await supabase
      .from('watermarks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetch a photographer's profile/branding by their homepage slug
   */
  async getPhotographerProfileBySlug(slug) {
    if (!slug) return null;

    // 1. Try to find by homepage_slug
    let { data, error } = await supabase
      .from('photographers')
      .select('*')
      .ilike('homepage_slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // 2. Fallback to display_name (default username)
    if (!data) {
      const { data: byDisplayName, error: pError } = await supabase
        .from('photographers')
        .select('*')
        .ilike('display_name', slug)
        .single();

      if (pError && pError.code !== 'PGRST116') {
        throw pError;
      }
      data = byDisplayName;
    }

    // 3. Fallback to email prefix (before '@')
    if (!data) {
      const { data: byEmail, error: eError } = await supabase
        .from('photographers')
        .select('*')
        .ilike('email', `${slug}@%`)
        .single();

      if (eError) {
        if (eError.code === 'PGRST116') return null; // No rows found
        throw eError;
      }
      data = byEmail;
    }

    return data;
  },

  /**
   * Resolve a verified custom domain to a photographer profile (public galleries).
   */
  async getPhotographerProfileByCustomDomain(domain) {
    const normalized = String(domain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .replace(/\.$/, '');

    if (!normalized) return null;

    const { data, error } = await supabase
      .from('photographers')
      .select('*')
      .ilike('custom_domain', normalized)
      .eq('custom_domain_status', 'verified')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  /**
   * Update a photographer's profile (bio, contact info, homepage settings, etc.)
   */
  async updatePhotographerProfile(photographerId, updates) {
    if (!photographerId) throw new Error('Photographer ID is required.');

    // First verify if the row exists because upsert can sometimes cause issues with RLS if not configured properly
    const { data: existing, error: existingError } = await supabase
      .from('photographers')
      .select('id')
      .eq('id', photographerId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    let query;
    if (existing) {
      query = supabase.from('photographers').update(updates).eq('id', photographerId);
    } else {
      query = supabase.from('photographers').insert([{ id: photographerId, ...updates }]);
    }

    const { data, error } = await query.select('*').single();

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
      throw new Error('Delivery ID and email are required');
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

        // Log registration for Email Registration activity tab (best-effort)
        try {
          const { data: col } = await supabase
            .from('deliveries')
            .select('photographer_id, user_id')
            .eq('id', collectionId)
            .maybeSingle();
          await this.logActivity(collectionId, 'email_register', {
            email,
            photographerId: col?.photographer_id || col?.user_id,
            metadata: { source: 'Gallery Registration', type: 'email' },
          });
        } catch (logErr) {
          console.warn('email_register activity log skipped:', logErr);
        }
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
        'Could not save this list (nothing was returned after update). Run the latest Supabase migrations, or add RLS policies so the delivery owner can SELECT and UPDATE favorite_lists.'
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
        'This favorite list could not be deleted. Sign in as the account that owns this delivery, or confirm the list still exists.'
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
   * Get download activity for a collection.
   * Combines free gallery downloads (activity_log) + paid digital purchase downloads (printstore).
   */
  async getDownloadActivity(collectionId) {
    try {
      console.log('Fetching download activity for collection:', collectionId);

      // Keep select simple — nested photo joins often fail under RLS and return empty.
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, event_type, visitor_email, created_at, metadata, resolution, photo_id')
        .eq('collection_id', collectionId)
        .eq('event_type', 'download')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('activity_log download fetch error:', error);
        throw error;
      }

      const photoIds = [...new Set((data || []).map((row) => row.photo_id).filter(Boolean))];
      let photosById = {};
      if (photoIds.length > 0) {
        const { data: photosData, error: photosErr } = await supabase
          .from('photos')
          .select('id, filename, set_id, media_type, thumbnail_url, web_url, full_url')
          .in('id', photoIds);
        if (photosErr) {
          console.warn('download activity photo hydrate failed:', photosErr);
        } else {
          photosById = Object.fromEntries((photosData || []).map((p) => [p.id, p]));
        }
      }

      const normalizeType = (item, photo) => {
        const metaType = String(item.metadata?.type || '').toLowerCase();
        if (metaType === 'gallery' || metaType === 'all' || metaType === 'digital_download_all' || metaType === 'digital_package') {
          return 'gallery';
        }
        if (metaType === 'video') return 'video';
        if (metaType === 'photo' || metaType === 'single' || metaType === 'single_photo' || metaType === 'digital_download') {
          return 'photo';
        }

        const mediaType = String(photo?.media_type || '').toLowerCase();
        if (mediaType === 'video') return 'video';

        const filename = photo?.filename || item.metadata?.filename || '';
        if (/\.(mp4|webm|ogg|mov)$/i.test(filename)) return 'video';

        if (item.photo_id || photo?.id || item.metadata?.photoCount === 1) return 'photo';
        return 'gallery';
      };

      const formatResolution = (item) => {
        const raw =
          item.resolution ||
          item.metadata?.resolution ||
          item.metadata?.quality ||
          'original';
        const key = String(raw).toLowerCase().replace(/\s+/g, '_');
        if (key === 'web' || key === 'web_res') return 'Web';
        if (key === 'full' || key === 'full_res' || key === 'high_res' || key === 'high') return 'Full';
        if (key === 'original' || key === 'orig' || key === 'hi_res') return 'Original';
        if (String(raw).toLowerCase() === 'high res') return 'Original';
        return String(raw);
      };

      const fromActivityLog = (data || []).map((item) => {
        const photo = item.photo_id ? photosById[item.photo_id] : null;
        return {
          id: item.id,
          email: item.visitor_email || 'Unknown visitor',
          date: item.created_at,
          type: normalizeType(item, photo),
          resolution: formatResolution(item),
          filename: photo?.filename || item.metadata?.filename || null,
          photoId: photo?.id || item.photo_id || null,
          photoSetId: photo?.set_id || null,
          photoCount: item.metadata?.photoCount ?? (item.photo_id ? 1 : null),
          destination: item.metadata?.destination || 'local',
          size: item.metadata?.size || null,
          pinUsed: item.metadata?.pinUsed || false,
          setName: item.metadata?.setName || null,
          pin: item.metadata?.pin || '---',
          source: item.metadata?.source || (item.metadata?.destination === 'google_drive' ? 'Google Drive' : 'Gallery'),
          _origin: 'activity_log',
        };
      });

      // Paid digital downloads (store purchases) — also show under Download Activity
      const fromStore = [];
      try {
        const { data: orders, error: ordersErr } = await supabase
          .from('printstore_orders')
          .select('id, customer_email, customer_name, created_at, status')
          .eq('collection_id', collectionId)
          .order('created_at', { ascending: false });

        if (!ordersErr && orders?.length) {
          const orderIds = orders.map((o) => o.id);
          const ordersById = Object.fromEntries(orders.map((o) => [o.id, o]));
          const { data: items, error: itemsErr } = await supabase
            .from('printstore_order_items')
            .select('id, order_id, product_type, product_name, options, quantity')
            .in('order_id', orderIds)
            .in('product_type', ['digital_download', 'digital_download_all', 'digital_package']);

          if (!itemsErr && items?.length) {
            const storePhotoIds = [
              ...new Set(
                items
                  .map((it) => it.options?.photo?.id || it.options?.photo_id)
                  .filter(Boolean)
                  .map(String)
              ),
            ];
            if (storePhotoIds.length) {
              const missing = storePhotoIds.filter((id) => !photosById[id]);
              if (missing.length) {
                const { data: morePhotos } = await supabase
                  .from('photos')
                  .select('id, filename, set_id, media_type, thumbnail_url, web_url, full_url')
                  .in('id', missing);
                (morePhotos || []).forEach((p) => {
                  photosById[p.id] = p;
                });
              }
            }

            for (const item of items) {
              const order = ordersById[item.order_id];
              if (!order) continue;
              const photoOpt = item.options?.photo || null;
              const photoId = photoOpt?.id || item.options?.photo_id || null;
              const photo = photoId ? photosById[photoId] : null;
              const isAll = item.product_type === 'digital_download_all';
              const isPackage = item.product_type === 'digital_package';
              const type = isAll || isPackage ? 'gallery' : 'photo';
              const filename =
                photo?.filename ||
                photoOpt?.filename ||
                photoOpt?.name ||
                item.product_name ||
                null;
              fromStore.push({
                id: `store-${item.id}`,
                email: order.customer_email || order.customer_name || 'Customer',
                date: order.created_at,
                type,
                resolution: 'Original',
                filename,
                photoId: photo?.id || photoId || null,
                photoSetId: photo?.set_id || null,
                photoCount:
                  isAll
                    ? null
                    : isPackage
                      ? Number(item.options?.photo_count || item.quantity || 1)
                      : 1,
                destination: 'email',
                size: null,
                pinUsed: false,
                setName: isAll ? 'All Photos' : isPackage ? 'Photo Package' : 'Digital Download',
                pin: '---',
                source: 'Digital Purchase',
                _origin: 'printstore',
              });
            }
          }
        }
      } catch (storeErr) {
        console.warn('store digital download activity merge failed:', storeErr);
      }

      const merged = [...fromActivityLog, ...fromStore].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return merged;
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
        'This activity row could not be deleted. Sign in as the account that owns this delivery, or confirm the entry still exists.'
      );
    }

    return true;
  },

  /**
   * Log an activity event
   */
  async logActivity(collectionId, eventType, data = {}) {
    try {
      let photographerId = data.photographerId || null;
      if (!photographerId && collectionId) {
        const { data: col } = await supabase
          .from('deliveries')
          .select('photographer_id, user_id')
          .eq('id', collectionId)
          .maybeSingle();
        photographerId = col?.photographer_id || col?.user_id || null;
      }
      if (!photographerId) {
        console.warn('logActivity skipped: missing photographer_id', { collectionId, eventType });
        return;
      }

      const row = {
        collection_id: collectionId,
        photographer_id: photographerId,
        event_type: eventType,
        visitor_email: data.email || null,
        photo_id: data.photoId || null,
        metadata: data.metadata || null,
      };
      if (data.resolution) {
        row.resolution = data.resolution;
      }
      const { error } = await supabase
        .from('activity_log')
        .insert([row]);
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
   * Registered visitor emails for a collection (Email Registration activity tab).
   * Source: client_sessions, one row per unique email (earliest registration).
   */
  async getEmailRegistrationActivity(collectionId) {
    if (!collectionId) return [];
    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select('id, visitor_email, created_at, access_level, download_count')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getEmailRegistrationActivity error:', error);
        throw error;
      }

      const byEmail = new Map();
      for (const row of data || []) {
        const email = String(row.visitor_email || '').trim().toLowerCase();
        if (!email) continue;
        const existing = byEmail.get(email);
        if (!existing) {
          byEmail.set(email, row);
          continue;
        }
        // Keep the earliest registration time
        if (new Date(row.created_at).getTime() < new Date(existing.created_at).getTime()) {
          byEmail.set(email, row);
        }
      }

      return [...byEmail.values()]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((row) => ({
          id: row.id,
          email: row.visitor_email,
          date: row.created_at,
          accessLevel: row.access_level || 'guest',
          downloadCount: Number(row.download_count) || 0,
          source: 'Gallery Registration',
        }));
    } catch (err) {
      console.error('Error in getEmailRegistrationActivity:', err);
      return [];
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
      .from('delivery_reminders')
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
      .from('delivery_reminders')
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
      .from('delivery_reminders')
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
      .from('delivery_reminders')
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
      .from('delivery_share_emails')
      .select('id, sender_email, recipient_email, subject, status, created_at')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data ?? [];
  },

  // ─── Vault Extension Plans (dedicated table) ───────────────────────

  /**
   * Fetch vault extension plan settings for a single collection.
   * Returns null if no row exists yet.
   */
  async fetchVaultPlan(collectionId) {
    if (!collectionId) return null;
    const { data, error } = await supabase
      .from('vault_extension_plans')
      .select('*')
      .eq('collection_id', collectionId)
      .maybeSingle();

    if (error) {
      console.error('fetchVaultPlan error:', error);
      return null;
    }
    return data;
  },

  /**
   * Upsert vault extension plan settings for a single collection.
   * Creates a new row if none exists, updates if it does.
   */
  async upsertVaultPlan(collectionId, settings) {
    if (!collectionId) throw new Error('collectionId is required');
    const { data, error } = await supabase
      .from('vault_extension_plans')
      .upsert({
        collection_id: collectionId,
        ...settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'collection_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upsert vault extension plan settings for multiple collections at once.
   */
  async upsertVaultPlanBatch(collectionIds, settings) {
    if (!collectionIds || collectionIds.length === 0) return;
    const rows = collectionIds.map(id => ({
      collection_id: id,
      ...settings,
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase
      .from('vault_extension_plans')
      .upsert(rows, { onConflict: 'collection_id' });

    if (error) throw error;
  },

  /**
   * Fetch all sales automations for the photographer.
   * If table doesn't exist, falls back to localStorage.
   */
  async fetchSalesAutomations(photographerId) {
    if (!photographerId) return [];
    try {
      const { data, error } = await supabase
        .from('sales_automations')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase fetchSalesAutomations failed, falling back to local cache:', err);
      try {
        const local = localStorage.getItem(`pixnxt_sales_automations_${photographerId}`);
        return local ? JSON.parse(local) : [];
      } catch (localErr) {
        return [];
      }
    }
  },

  /**
   * Save (Insert/Update) a sales automation campaign.
   */
  async saveSalesAutomation(photographerId, automation) {
    if (!photographerId) throw new Error('photographerId is required');
    const now = new Date().toISOString();
    const payload = {
      ...automation,
      photographer_id: photographerId,
      last_activity: now,
      updated_at: now
    };

    try {
      const { data, error } = await supabase
        .from('sales_automations')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase saveSalesAutomation failed, writing to local cache:', err);
      // Local fallback
      try {
        const localStr = localStorage.getItem(`pixnxt_sales_automations_${photographerId}`);
        let automations = localStr ? JSON.parse(localStr) : [];
        const targetId = automation.id || 'auto_' + Math.random().toString(36).substr(2, 9);
        const existingIdx = automations.findIndex(a => a.id === targetId);

        const newAutomation = {
          ...payload,
          id: targetId,
          created_at: automation.created_at || now
        };

        if (existingIdx >= 0) {
          automations[existingIdx] = newAutomation;
        } else {
          automations.push(newAutomation);
        }

        localStorage.setItem(`pixnxt_sales_automations_${photographerId}`, JSON.stringify(automations));
        return newAutomation;
      } catch (localErr) {
        throw err;
      }
    }
  },

  /**
   * Delete a sales automation.
   */
  async deleteSalesAutomation(photographerId, id) {
    try {
      const { error } = await supabase
        .from('sales_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.warn('Supabase deleteSalesAutomation failed, removing from local cache:', err);
      try {
        const localStr = localStorage.getItem(`pixnxt_sales_automations_${photographerId}`);
        if (localStr) {
          let automations = JSON.parse(localStr);
          automations = automations.filter(a => a.id !== id);
          localStorage.setItem(`pixnxt_sales_automations_${photographerId}`, JSON.stringify(automations));
        }
      } catch (localErr) {
        throw err;
      }
    }
  }
};
