/** Lazy so the Workers bundle stays code-split. */
const workersGallery = () => import('./workersGallery.service');

/** Photo-row writes (Workers backend; snake_case in, row out). */
async function dbInsertPhotoRow(row) {
  const { apiFetch } = await import('../lib/api/client');
  const data = await apiFetch(`/v1/galleries/${row.collection_id}/photos`, {
    method: 'POST',
    body: {
      filename: row.filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes ?? 0,
      width: row.width ?? null,
      height: row.height ?? null,
      storagePath: row.original_storage_path,
      status: row.status ?? 'uploading',
      mediaType: row.media_type ?? 'image',
      position: row.position ?? 0,
      setId: row.set_id ?? null,
      thumbnailUrl: row.thumbnail_url ?? null,
      webUrl: row.web_url ?? null,
      watermarkedUrl: row.watermarked_url ?? null,
      fullUrl: row.full_url ?? null,
      thumbnailStoragePath: row.thumbnail_storage_path ?? null,
      webStoragePath: row.web_storage_path ?? null,
      watermarkedStoragePath: row.watermarked_storage_path ?? null,
      exifTakenAt: row.exif_taken_at ?? null,
      exifCamera: row.exif_camera ?? null,
      exifLens: row.exif_lens ?? null,
    },
  });
  if (!data?.photo) throw new Error('Photo database insert failed');
  return data.photo;
}

/** Photo-row patch (Workers backend; throws with details). */
async function dbUpdatePhotoRow(id, patch) {
  const { apiFetch } = await import('../lib/api/client');
  const data = await apiFetch(`/v1/galleries/photos/${id}`, { method: 'PATCH', body: patch });
  if (!data?.photo) throw new Error('Photo database update failed');
  return data.photo;
}
import { getImageDimensionsFast } from '../lib/imageDimensions';
import { getFileMime, isVideoMime, getUploadMediaType } from '../lib/fileMime';
import { compressImageForUpload, compressImageVariants } from '../lib/prepareUploadFile';
import { isRawImageFile } from '../lib/rawImageFormats';
import { extractRawPreviewBlob } from '../lib/rawImagePreview';
import { hasRawDisplayPreview, isRawMedia, resolveMediaUrl } from '../lib/photoDisplayUrl';
import { DELIVERY_R2_MODULE } from '../lib/deliveryIds';
import { getPhotographerR2Folder } from '../lib/photographerR2Folder';
import {
  resolveUploadDefaults,
  webMaxEdgeForQuality,
  uploadMaxEdgeForQuality,
} from '../lib/uploadDefaults';
import { storageService } from './storage.service';
import { photographerQuotaService } from './photographerQuota.service';
import {
  isIncompleteUploadPhoto,
  resolveOriginalStoragePath,
} from '../components/features/CollectionDashboard/Upload/uploadUtils';

function getUploadVariantOptions() {
  const defaults = resolveUploadDefaults(null);
  return {
    webMaxEdge: webMaxEdgeForQuality(defaults.webDisplayQuality),
    thumbMaxEdge: 400,
    thumbQuality: 0.6,
  };
}

function getOriginalUploadMaxEdge() {
  const defaults = resolveUploadDefaults(null);
  return uploadMaxEdgeForQuality(defaults.uploadQuality);
}

const PHOTO_STORAGE_PATH_COLUMNS = [
  'original_storage_path',
  'thumbnail_storage_path',
  'web_storage_path',
  'watermarked_storage_path',
];

const collectionPathNameCache = new Map();

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
    const gallery = await (await workersGallery()).getCollectionById(collectionId);
    const folder = `${safePathSegment(gallery?.name, 'delivery')}__${collectionId}`;
    collectionPathNameCache.set(collectionId, folder);
    return folder;
  } catch {
    return `delivery__${collectionId}`;
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
export function mapCollectionDashboardRow(c) {
  const photoRows = c.photos || [];
  const storage_bytes = photoRows.reduce((sum, p) => sum + (Number(p.size_bytes) || 0), 0);
  const storedTotal = Number(c.total_size_bytes);
  const photo_filenames = photoRows
    .map((p) => p.filename)
    .filter((name) => typeof name === 'string' && name.length > 0);
  const video_count = photo_filenames.filter((name) =>
    /\.(mp4|webm|ogg|mov|m4v|mkv|avi|wmv)$/i.test(name)
  ).length;
  const { photos, ...rest } = c;
  return {
    ...rest,
    photo_count: rest.photo_count ?? photoRows.length,
    video_count: rest.video_count ?? video_count,
    photo_filenames,
    storage_bytes:
      Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : storage_bytes,
  };
}

export const galleryService = {
  /**
   * Fetch all collections for a specific photographer (Dashboard view)
   */
  async getCollections(photographerId) {
    return (await workersGallery()).getCollections(photographerId);
  },

  /**
   * Attention + earnings for the Deliveries board (submitted lists, stuck orders, store totals).
   */
  async getDeliveryBoardExtras(collectionIds) {
    return (await workersGallery()).getDeliveryBoardExtras(collectionIds);
  },

  /** Starred collections for the dashboard Starred page. */
  async getStarredCollections(photographerId) {
    return (await workersGallery()).getStarredCollections(photographerId);
  },

  /** Starred photos across all deliveries for the dashboard Starred → Photos tab. */
  async getStarredPhotos() {
    return (await workersGallery()).getStarredPhotos();
  },

  /** Every client-gallery photo for the photographer Photo Library. */
  async getLibraryPhotos() {
    return (await workersGallery()).getLibraryPhotos();
  },

  /**
   * Folders for the move-collection picker, with cover from folder or first collection inside.
   */
  async getFoldersForMove() {
    return (await workersGallery()).getFoldersForMove();
  },

  /**
   * @param {string} photographerId
   * @param {string | { name: string; eventDate?: string | null; showOnShowcase?: boolean; passwordEnabled?: boolean; password?: string | null }} nameOrOptions
   */
  async createFolder(photographerId, nameOrOptions) {
    return (await workersGallery()).createFolder(photographerId, nameOrOptions);
  },

  async moveCollectionToFolder(collectionId, folderId) {
    return (await workersGallery()).moveCollectionToFolder(collectionId, folderId);
  },

  /**
   * Folders for the client gallery grid (with collection counts).
   */
  async listFoldersForGallery(photographerId) {
    return (await workersGallery()).listFoldersForGallery(photographerId);
  },

  async getFolderById(folderId) {
    return (await workersGallery()).getFolderById(folderId);
  },

  /** Collections inside a folder (same shape as getCollections rows). */
  async getCollectionsForFolder(photographerId, folderId) {
    return (await workersGallery()).getCollectionsForFolder(photographerId, folderId);
  },

  async updateFolder(folderId, photographerId, updates) {
    return (await workersGallery()).updateFolder(folderId, photographerId, updates);
  },

  async deleteFolder(folderId) {
    return (await workersGallery()).deleteFolder(folderId);
  },

  /**
   * Fetch all published collections for a specific photographer (Public view)
   */
  async getPublicCollections(photographerId) {
    return (await workersGallery()).getPublicCollections(photographerId);
  },

  /** Public Showcase enquiry form submission */
  async submitShowcaseEnquiry({ photographerId, name, email, message }) {
    return (await workersGallery()).submitShowcaseEnquiry({ photographerId, name, email, message });
  },

  /** Studio inbox: recent Showcase enquiries */
  async getShowcaseEnquiries(photographerId, limit = 20) {
    return (await workersGallery()).getShowcaseEnquiries(photographerId, limit);
  },

  /**
   * Create a new delivery
   */
  async createCollection(collectionData) {
    return (await workersGallery()).createCollection(collectionData);
  },

  /**
   * Duplicate a collection: copies metadata, sets, and all media (photos + videos, same storage URLs).
   */
  async duplicateCollection(sourceCollectionId, photographerId) {
    return (await workersGallery()).duplicateCollection(sourceCollectionId, photographerId);
  },

  /**
   * Save cover focal point. Uses cover_focal_x/y when present; falls back to #focal= on cover_url.
   */
  async saveCollectionFocalPoint(collectionId, coverUrl, focalX, focalY) {
    return (await workersGallery()).saveCollectionFocalPoint(collectionId, coverUrl, focalX, focalY);
  },

  /**
   * Save per-surface cover focals (website / desktop / phone / card / email).
   * cover_focal_x/y stay in sync with the website point for older readers.
   */
  async saveCollectionCoverFocals(collectionId, coverUrl, focals, extra = {}) {
    return (await workersGallery()).saveCollectionCoverFocals(collectionId, coverUrl, focals, extra);
  },

  /**
   * Update an existing collection
   */
  /**
   * Update an existing collection.
   * Drops unknown columns / invalid enum values and retries so one bad field
   * cannot block the rest of a design autosave.
   */
  async updateCollection(id, updateData) {
    return (await workersGallery()).updateCollection(id, updateData);
  },

  /**
   * Persist delivery visibility (`draft` | `published` | `archived` / Hidden).
   * Never drops `status` on retry — design autosave stripping must not apply here.
   */
  async updateCollectionStatus(id, status) {
    return (await workersGallery()).updateCollectionStatus(id, status);
  },

  /**
   * Delete a collection and all associated files
   */
  async deleteCollection(id) {
    return (await workersGallery()).deleteCollection(id);
  },

  /**
   * Fetch collection + sets + photos for the manage dashboard (parallel, slim photo fields).
   */
  async getCollectionDashboardData(id) {
    return (await workersGallery()).getCollectionDashboardData(id);
  },

  /**
   * Fetch a single collection by ID (for management) — includes sets and photos
   */
  async getCollectionById(id) {
    return (await workersGallery()).getCollectionById(id);
  },

  /**
   * Fetch a single published collection by slug (public gallery / QR).
   * Studio preview may pass `collectionId` (`cid` query) to load the owner's delivery
   * regardless of publish status or slug autosave lag.
   */
  async getCollectionBySlug(slug, options = {}) {
    return (await workersGallery()).getCollectionBySlug(slug, options);
  },

  // ─── SET CRUD ──────────────────────────────────────────────

  /**
   * Fetch all sets for a collection
   */
  async getSets(collectionId) {
    return (await workersGallery()).getSets(collectionId);
  },

  /**
   * Create a new set
   */
  async createSet({ collectionId, photographerId, name, description, position }) {
    return (await workersGallery()).createSet({ collectionId, photographerId, name, description, position });
  },

  /**
   * Update a set's name/description
   */
  async updateSet(setId, updateData) {
    return (await workersGallery()).updateSet(setId, updateData);
  },

  /**
   * Delete a set and all photos in it (DB + Cloudflare R2).
   */
  async deleteSet(setId) {
    return (await workersGallery()).deleteSet(setId);
  },

  /**
   * Assign photos to a specific set (or unassign by passing null)
   */
  async assignPhotosToSet(photoIds, setId) {
    return (await workersGallery()).assignPhotosToSet(photoIds, setId);
  },

  /**
   * Duplicate a set and copy its photo rows (same storage URLs, new records).
   */
  async duplicateSet({
    collectionId,
    photographerId,
    name,
    description,
    position,
    photos = [],
  }) {
    return (await workersGallery()).duplicateSet({ collectionId, photographerId, name, description, position, photos });
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
        const { apiFetch } = await import('../lib/api/client');
        const storage = await apiFetch('/v1/me/storage').catch(() => null);
        if (storage) {
          profile = {
            storage_used_bytes: storage.totalBytes ?? storage.storedBytes ?? 0,
            storage_limit_bytes: storage.limitBytes ?? null,
            plan: storage.plan ?? null,
          };
        } else {
          const data = await apiFetch('/v1/me');
          profile = data?.photographer ?? null;
        }
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
        photographerFolder || getPhotographerR2Folder(photographerId),
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

  /** Public alias for watermark uploads and other delivery photo paths. */
  resolveDeliveryPhotoBasePath(photographerId, collectionId, setId) {
    return this._resolveUploadBasePath(photographerId, collectionId, setId);
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
        compressImageVariants(file, getUploadVariantOptions()).catch(
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
          ...getUploadVariantOptions(),
          enhanceRaw: true,
        }).catch(
          () => ({ webFile: previewFile, thumbFile: previewFile })
        );
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

    const photoData = await dbInsertPhotoRow({
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
      width: Number.isFinite(dimensions.width) ? dimensions.width : null,
      height: Number.isFinite(dimensions.height) ? dimensions.height : null,
      media_type: mediaType,
      position: index,
      status: 'ready',
    });

    if (onInserted) {
      onInserted(photoData);
    }
    photographerQuotaService.invalidate(photographerId);
    photographerQuotaService.notifyQuotaChanged();

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
        photoData,
      },
    };
  },

  /**
   * Look up existing photo rows by filename (live DB — not React state).
   * Prefers the active set, then incomplete rows on filename collision.
   */
  async findPhotosByFilenames(collectionId, filenames, preferredSetId = null) {
    if (!collectionId || !filenames?.length) return [];

    const gallery = await (await workersGallery()).getCollectionDashboardData(collectionId);
    const rows = gallery.photos || [];

    const byName = new Map();
    for (const photo of rows || []) {
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
      photoData: photo,
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
    const uploadEdge = getOriginalUploadMaxEdge();
    if (!isVideo && !isRaw && uploadEdge) {
      originalFile = await compressImageForUpload(file, { maxEdge: uploadEdge }).catch(() => file);
    }

    const uploadBody =
      originalFile.type === mime
        ? originalFile
        : new File([originalFile], originalFile.name, {
            type: mime,
            lastModified: originalFile.lastModified,
          });

    const uploadResult = await storageService.upload(filePath, uploadBody, onProgress, signal);

    let finalPhoto = null;
    try {
      finalPhoto = await dbUpdatePhotoRow(photoId, {
        full_url: uploadResult.url,
        original_storage_path: filePath,
      });
    } catch (err) {
      console.warn('Photo original finalize select failed:', err?.message || err);
    }

    if (isVideo && thumbnailBlob) {
      const thumbnailPathVideo = `${basePath}/thumb/${fileNameJpg}`;
      void storageService
        .upload(thumbnailPathVideo, thumbnailBlob)
        .then(({ url: thumbUrl }) =>
          dbUpdatePhotoRow(photoId, { thumbnail_url: thumbUrl, thumbnail_storage_path: thumbnailPathVideo })
        )
        .catch((err) => console.warn('Video thumbnail upload deferred failed:', err));
    }

    return {
      ...(uploadContext.photoData || {}),
      ...(finalPhoto || {}),
      id: photoId,
      full_url: finalPhoto?.full_url || uploadResult.url,
      original_storage_path: finalPhoto?.original_storage_path || filePath,
    };
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

    return { ...photoData, ...finalPhoto };
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

    // Build real web (large) + thumb (small) derivatives instead of pointing
    // both URLs at the same file — otherwise the lightbox stays blurry.
    const previewFile = new File([previewBlob], 'preview.jpg', { type: 'image/jpeg' });
    const variants = await compressImageVariants(previewFile, {
      ...getUploadVariantOptions(),
      enhanceRaw: true,
    }).catch(
      () => ({ webFile: previewFile, thumbFile: previewFile })
    );
    const stem = String(storagePath.split('/').pop() || 'preview').replace(/\.[^.]+$/, '');
    const origMatch = storagePath.match(/^(.*)\/original\/[^/]+$/);
    const basePath = origMatch ? origMatch[1] : storagePath.replace(/\/[^/]+$/, '');
    const webPath = `${basePath}/web/${stem}.jpg`;
    const thumbPath = `${basePath}/thumb/${stem}.jpg`;
    const [{ url: webUrl }, { url: thumbUrl }] = await Promise.all([
      storageService.upload(webPath, variants.webFile),
      storageService.upload(thumbPath, variants.thumbFile),
    ]);
    const dimensions = meta.dimensions ?? { width: null, height: null };

    const data = await dbUpdatePhotoRow(photo.id, {
      web_url: webUrl,
      thumbnail_url: thumbUrl,
      web_storage_path: webPath,
      thumbnail_storage_path: thumbPath,
      width: dimensions.width,
      height: dimensions.height,
    });
    if (!data) throw new Error('Photo preview update failed');
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

    const gallery = await (await workersGallery()).getCollectionDashboardData(collectionId);
    const existing = (gallery.photos || []).find((p) => p.id === photoId) ?? null;
    if (!existing || existing.collection_id !== collectionId) {
      throw new Error('Photo not found in this delivery.');
    }

    const mime = getFileMime(file);
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const [photographerFolder, collectionFolder] = await Promise.all([
      getPhotographerR2Folder(photographerId),
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
        compressImageVariants(file, getUploadVariantOptions()).catch(
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
          ...getUploadVariantOptions(),
          enhanceRaw: true,
        }).catch(
          () => ({ webFile: previewFile, thumbFile: previewFile })
        );
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
    const uploadEdge = getOriginalUploadMaxEdge();
    if (!isVideo && !isRaw && uploadEdge) {
      originalFile = await compressImageForUpload(file, { maxEdge: uploadEdge }).catch(() => file);
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

    const photoData = await dbUpdatePhotoRow(photoId, {
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
    });
    if (!photoData) {
      throw new Error('Photo database update failed');
    }

    if (isVideo && thumbnailBlob) {
      const thumbnailPathVideo = `${basePath}/thumb/${fileNameJpg}`;
      void storageService.upload(thumbnailPathVideo, thumbnailBlob).then(({ url: thumbUrl }) =>
        dbUpdatePhotoRow(photoId, { thumbnail_url: thumbUrl, thumbnail_storage_path: thumbnailPathVideo })
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
    return (await workersGallery()).updatePhoto(id, updateData);
  },

  /**
   * Delete photos from Cloudflare R2 and the database (plus related rows).
   */
  async deletePhotos(ids) {
    return (await workersGallery()).deletePhotos(ids);
  },

  /**
   * Toggle the is_starred status of a photo
   */
  async togglePhotoStar(id, isStarred) {
    return (await workersGallery()).togglePhotoStar(id, isStarred);
  },

  /**
   * Fetch a photographer's profile/branding
   */
  async getPhotographerProfile(photographerId) {
    return (await workersGallery()).getPhotographerProfile(photographerId);
  },

  /**
   * Own full photographer row (sidebar shell, upload defaults).
   */
  async getOwnProfile() {
    return (await workersGallery()).getOwnFullProfile();
  },

  /**
   * Fetch all watermarks for a photographer
   */
  async getWatermarks() {
    return (await workersGallery()).listWatermarks();
  },

  /**
   * Fetch a single watermark by ID
   */
  async getWatermark(id) {
    return (await workersGallery()).getWatermark(id);
  },

  /**
   * Create a new watermark
   */
  async createWatermark(watermarkData) {
    return (await workersGallery()).createWatermark(watermarkData);
  },

  /**
   * Update an existing watermark
   */
  async updateWatermark(id, updates) {
    return (await workersGallery()).updateWatermark(id, updates);
  },

  /**
   * Delete a watermark
   */
  async deleteWatermark(id) {
    return (await workersGallery()).deleteWatermark(id);
  },

  /**
   * Delivery presets (photographer-saved delivery settings).
   */
  async getPresets() {
    const rows = await (await workersGallery()).listPresets();
    return [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async createPreset(photographerId, name, settings) {
    return (await workersGallery()).createPreset(name, settings);
  },

  async deletePreset(id) {
    return (await workersGallery()).deletePreset(id);
  },

  /**
   * Fetch a photographer's profile/branding by their showcase slug (DB: showcase_slug)
   */
  async getPhotographerProfileBySlug(slug) {
    return (await workersGallery()).getPhotographerProfileBySlug(slug);
  },

  /**
   * Resolve a verified custom domain to a photographer profile (public galleries).
   */
  async getPhotographerProfileByCustomDomain(domain) {
    return (await workersGallery()).getPhotographerProfileByCustomDomain(domain);
  },

  /**
   * Update a photographer's profile (bio, contact info, showcase settings, etc.)
   */
  async updatePhotographerProfile(photographerId, updates) {
    return (await workersGallery()).updatePhotographerProfile(photographerId, updates);
  },

  /**
   * Public gallery email registration (once per visitor).
   * Stores email / name / phone on the session and studio contacts list.
   */
  async registerGalleryVisitor({ collectionId, email, name, phone } = {}) {
    return (await workersGallery()).registerGalleryVisitor({ collectionId, email, name, phone });
  },

  /**
   * Create or get a client session for favorites/downloads
   * @param {string} collectionId
   * @param {string} email
   * @param {{ ensureDefaultFavoriteList?: boolean, name?: string|null, phone?: string|null }} [options] Pass `{ ensureDefaultFavoriteList: false }` when the caller will insert their own preset list (e.g. dashboard "Create favorite list") so a duplicate "My Favorites" row is not created.
   */
  async createOrGetSession(collectionId, email, options = {}) {
    return (await workersGallery()).createOrGetSession(collectionId, email, options);
  },

  /**
   * Active list for a visitor session: prefer the client's own lists over photographer presets.
   */
  async _resolveDefaultFavoriteList(sessionId) {
    if (!sessionId) return null;
    return (await workersGallery()).resolveDefaultFavoriteList(sessionId);
  },

  async _getDefaultFavoriteListId(sessionId) {
    const row = await this._resolveDefaultFavoriteList(sessionId);
    return row?.id ?? null;
  },

  /** Public: list row used for gallery hearts / toasts (name + cap). */
  async getSessionDefaultFavoriteList(sessionId) {
    return (await workersGallery()).getSessionDefaultFavoriteList(sessionId);
  },

  /**
   * Favorited photo IDs for a visitor list (defaults to active preset / My Favorites).
   */
  async getFavorites(sessionId, listId = null) {
    return (await workersGallery()).getFavorites(sessionId, listId);
  },

  /**
   * Public view of a favorite list — no session validation required.
   * Used by the shareable "Get Link" public favorites page.
   */
  async getFavoriteListPublic(listId) {
    return (await workersGallery()).getFavoriteListPublic(listId);
  },

  /**
   * Favorite list metadata for gallery selection UI.
   */
  async getFavoriteListById(listId) {
    return (await workersGallery()).getFavoriteListById(listId);
  },

  /**
   * Submit (lock) a visitor favorite list — requires at least one photo.
   */
  async submitFavoriteList(listId, sessionId) {
    return (await workersGallery()).submitFavoriteList(listId, sessionId);
  },

  /**
   * Reopen a submitted favorite list so the client can edit choices again (clears lock).
   */
  async reopenFavoriteList(listId) {
    return (await workersGallery()).reopenFavoriteList(listId);
  },

  /**
   * Email the collection photographer after a client confirms favorites.
   */
  async notifyPhotographerFavoriteSubmit({ listId, sessionId, clientMessage }) {
    return (await workersGallery()).notifyPhotographerFavoriteSubmit({ listId, sessionId, clientMessage });
  },

  /**
   * Create a favorite list (dashboard preset or visitor "new list").
   * @param {{ maxSelection?: number|null, description?: string|null }} [meta]
   */
  async createFavoriteList(collectionId, sessionId, listName, meta = {}) {
    return (await workersGallery()).createFavoriteList(collectionId, sessionId, listName, meta);
  },

  /**
   * Toggle a photo as favorite
   */
  async toggleFavorite(sessionId, photoId, isFavorite, listId = null) {
    return (await workersGallery()).toggleFavorite(sessionId, photoId, isFavorite, listId);
  },

  /**
   * Get favorite activity for a collection
   */
  async getFavoriteActivity(collectionId) {
    return (await workersGallery()).getFavoriteActivity(collectionId);
  },

  /**
   * Photo ids used in client favorite / selection-list overlays (dashboard View menu).
   */
  async getCollectionFavoriteOverlayPhotoIds(collectionId) {
    return (await workersGallery()).getCollectionFavoriteOverlayPhotoIds(collectionId);
  },

  /**
   * Get all photos for a favorite list
   */
  async getFavoriteListPhotos(listId) {
    return (await workersGallery()).getFavoriteListPhotos(listId);
  },

  /**
   * Favorite list rows with item timestamps (dashboard detail panel).
   */
  async getFavoriteListItemRows(listId) {
    return (await workersGallery()).getFavoriteListItemRows(listId);
  },

  /**
   * Visitor's favorite lists for the favorites hub (/gallery/:slug/f).
   */
  async getFavoriteListsForSession(sessionId) {
    return (await workersGallery()).getFavoriteListsForSession(sessionId);
  },

  /**
   * Update a favorite list's metadata
   */
  async updateFavoriteList(listId, updateData) {
    return (await workersGallery()).updateFavoriteList(listId, updateData);
  },

  /**
   * Delete a favorite list and its items (collection owner only).
   * Uses RPC with SECURITY DEFINER so deletes succeed even when direct table DELETE is blocked by RLS.
   */
  async deleteFavoriteList(listId) {
    return (await workersGallery()).deleteFavoriteList(listId);
  },

  /**
   * Remove one photo from a favorite list (collection owner / dashboard).
   */
  async removePhotoFromFavoriteList(listId, photoId) {
    return (await workersGallery()).removePhotoFromFavoriteList(listId, photoId);
  },

  /**
   * Get download activity for a collection.
   * Combines free gallery downloads (activity_log) + paid digital purchase downloads (printstore).
   */
  async getDownloadActivity(collectionId) {
    return (await workersGallery()).getDownloadActivity(collectionId);
  },

  /**
   * Delete an activity log entry (collection owner only).
   * Uses RPC with SECURITY DEFINER so deletes persist under RLS.
   */
  async deleteActivity(activityId) {
    return (await workersGallery()).deleteActivity(activityId);
  },

  /**
   * Log an activity event
   */
  async logActivity(collectionId, eventType, data = {}) {
    return (await workersGallery()).logActivity(collectionId, eventType, data);
  },

  /**
   * Get the download count for a collection
   */
  async getDownloadCount(collectionId) {
    return (await workersGallery()).getDownloadCount(collectionId);
  },

  /**
   * Get the number of times the download PIN has been successfully used
   */
  async getPinUsageCount(collectionId) {
    return (await workersGallery()).getPinUsageCount(collectionId);
  },

  /**
   * Registered visitor emails for a collection (Email Registration activity tab).
   * Source: client_sessions, one row per unique email (earliest registration).
   */
  async getEmailRegistrationActivity(collectionId) {
    return (await workersGallery()).getEmailRegistrationActivity(collectionId);
  },

  /**
   * Get aggregate counts for different activity types (for Expiry Reminder modal)
   */
  async getGalleryOpenActivity(collectionId) {
    return (await workersGallery()).getGalleryOpenActivity(collectionId);
  },

  async getActivityCounts(collectionId) {
    return (await workersGallery()).getActivityCounts(collectionId);
  },

  /**
   * Fetch all expiry reminders for a collection
   */
  async getCollectionReminders(collectionId) {
    return (await workersGallery()).getCollectionReminders(collectionId);
  },

  /**
   * Create a new expiry reminder
   */
  async createCollectionReminder(reminderData) {
    return (await workersGallery()).createCollectionReminder(reminderData);
  },

  /**
   * Update an existing expiry reminder
   */
  async updateCollectionReminder(id, updateData) {
    return (await workersGallery()).updateCollectionReminder(id, updateData);
  },

  /**
   * Delete an expiry reminder
   */
  async deleteCollectionReminder(id) {
    return (await workersGallery()).deleteCollectionReminder(id);
  },

  /**
   * Create a default reminder if this delivery has none yet.
   */
  async ensureCollectionReminder(collectionId, patch = {}) {
    return (await workersGallery()).ensureCollectionReminder(collectionId, patch);
  },

  /**
   * Send a gallery share email from one visitor to another (public share modal).
   */
  async shareCollectionByEmail({ collectionSlug, collectionId, recipientEmail, senderEmail, personalMessage, subject }) {
    return (await workersGallery()).shareCollectionByEmail({ collectionSlug, collectionId, recipientEmail, senderEmail, personalMessage, subject });
  },

  /**
   * Send a selection-list invite email to a client (photographer dashboard).
   */
  async sendSelectionListEmail({ collectionSlug, recipientEmail, subject, message, chooseUrl }) {
    return (await workersGallery()).sendSelectionListEmail({ collectionSlug, recipientEmail, subject, message, chooseUrl });
  },

  /**
   * Email history for photographer dashboard (visitor share emails).
   */
  async getCollectionShareEmailHistory(collectionId) {
    return (await workersGallery()).getCollectionShareEmailHistory(collectionId);
  },

  // ─── Vault Extension Plans (dedicated table) ───────────────────────

  /**
   * Fetch vault extension plan settings for a single collection.
   * Returns null if no row exists yet.
   */
  async fetchVaultPlan(collectionId) {
    return (await workersGallery()).fetchVaultPlan(collectionId);
  },

  /**
   * Upsert vault extension plan settings for a single collection.
   * Creates a new row if none exists, updates if it does.
   */
  async upsertVaultPlan(collectionId, settings) {
    return (await workersGallery()).upsertVaultPlan(collectionId, settings);
  },

  /**
   * Upsert vault extension plan settings for multiple collections at once.
   */
  async upsertVaultPlanBatch(collectionIds, settings) {
    return (await workersGallery()).upsertVaultPlanBatch(collectionIds, settings);
  },

  /**
   * Fetch all sales automations for the photographer.
   * If table doesn't exist, falls back to localStorage.
   */
  async fetchSalesAutomations(photographerId) {
    return (await workersGallery()).fetchSalesAutomations(photographerId);
  },

  /**
   * Save (Insert/Update) a sales automation campaign.
   */
  async saveSalesAutomation(photographerId, automation) {
    return (await workersGallery()).saveSalesAutomation(photographerId, automation);
  },

  /**
   * Delete a sales automation.
   */
  async deleteSalesAutomation(photographerId, id) {
    return (await workersGallery()).deleteSalesAutomation(photographerId, id);
  },

  /**
   * Store orders for a collection (CollectionDashboard activity feed).
   * Workers: GET /v1/store/orders + /v1/store/order-items.
   */
  async getStoreOrders(collectionId) {
    return (await workersGallery()).getStoreOrders(collectionId);
  },

  async getStoreOrderItems(collectionId) {
    return (await workersGallery()).getStoreOrderItems(collectionId);
  },

  /**
   * Quota snapshot (Workers: GET /v1/me/quota).
   */
  async getQuotaSnapshot() {
    return (await workersGallery()).getQuotaSnapshot();
  },

  /**
   * Storage usage (Workers: GET /v1/me/storage).
   */
  async getStorageUsage() {
    return (await workersGallery()).getStorageUsage();
  },

  /**
   * Bounded activity fan-out (Workers: GET /v1/engage/notifications).
   */
  async getNotificationsBulk(collectionIds) {
    return (await workersGallery()).getNotificationsBulk(collectionIds);
  },

  async getStudioOverview() {
    return (await workersGallery()).getStudioOverview();
  },

  async listReferrals() {
    return (await workersGallery()).listReferrals();
  },

  async createReferral(referredEmail) {
    return (await workersGallery()).createReferral(referredEmail);
  },

  async listContacts() {
    return (await workersGallery()).listContacts();
  },
};
