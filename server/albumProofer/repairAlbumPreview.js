import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getSupabaseUrl, getSupabaseUserClient } from '../photoAi/supabaseAdmin.js';

function getAnonClient() {
  const url = getSupabaseUrl();
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getR2Config() {
  const accountId = process.env.VITE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  const publicUrl = (process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').replace(
    /\/+$/,
    ''
  );
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let cachedClient = null;

function getR2Client() {
  if (cachedClient) return cachedClient;
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 storage is not configured.');
  }
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return cachedClient;
}

function safeSegment(value, fallback = 'photo') {
  return (
    String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || fallback
  );
}

function storagePathSortKey(key) {
  const base = String(key || '').split('/').pop() || '';
  const match = base.match(/^(\d+)-(\d+)-/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

function isLikelyAlbumImageKey(key) {
  const base = String(key || '').split('/').pop() || '';
  if (!base || base.endsWith('/')) return false;
  if (/\.(jpe?g|png|webp|gif|heic|heif|tiff?)$/i.test(base)) return true;
  if (/^\d+-\d+-/.test(base)) return true;
  return false;
}

function collectionItemFromKey(key, index, size, publicUrl) {
  const sortKey = storagePathSortKey(key);
  const sortOrder = sortKey ? sortKey[0] * 100000 + sortKey[1] : index;
  const base = String(key).split('/').pop() || 'Photo';
  return {
    id: `r2_${safeSegment(key).slice(0, 48)}`,
    name: base.replace(/^\d+-\d+-/, '') || 'Photo',
    dataUrl: `${publicUrl}/${key}`,
    storagePath: key,
    size_bytes: Number(size) || 0,
    sortOrder,
    createdAt: sortKey ? sortKey[0] : Date.now(),
  };
}

async function listObjectsByPrefix(prefix, maxKeys = 2000) {
  const { bucket } = getR2Config();
  const client = getR2Client();
  const objects = [];
  let continuationToken;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: Math.min(1000, maxKeys - objects.length),
        ContinuationToken: continuationToken,
      })
    );
    for (const entry of response.Contents || []) {
      if (entry.Key && !entry.Key.endsWith('/')) {
        objects.push({ key: entry.Key, size: Number(entry.Size) || 0 });
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken && objects.length < maxKeys);
  return objects;
}

async function listAlbumR2Collection(albumId, photographer) {
  const { publicUrl } = getR2Config();
  if (!publicUrl) throw new Error('VITE_R2_PUBLIC_URL is not configured.');

  const emailPrefix = String(photographer?.email || '').split('@')[0];
  const folders = new Set();
  const fromEmail = emailPrefix ? safeSegment(emailPrefix, '') : '';
  const fromName = photographer?.display_name ? safeSegment(photographer.display_name, '') : '';
  if (fromEmail) folders.add(fromEmail);
  if (fromName) folders.add(fromName);
  if (fromName) folders.add(fromName.replace(/-/g, ''));
  if (fromEmail) folders.add(fromEmail.replace(/-/g, ''));
  if (photographer?.id) folders.add(safeSegment(photographer.id, 'photographer'));
  folders.delete('');

  const albumName = safeSegment(photographer?.albumName || 'album', 'album');
  const albumFolders = new Set([
    `${albumName}__${albumId}`,
    `${albumName}_${albumId}`,
    `album__${albumId}`,
    `album_${albumId}`,
  ]);

  const seen = new Set();
  const found = [];

  for (const folder of folders) {
    for (const module of ['album-proofer', 'smart-album']) {
      for (const albumFolder of albumFolders) {
        const prefix = `users/${folder}/${module}/${albumFolder}/`;
        for (const obj of await listObjectsByPrefix(prefix, 2000)) {
          if (seen.has(obj.key) || !isLikelyAlbumImageKey(obj.key)) continue;
          seen.add(obj.key);
          found.push(obj);
        }
      }
    }
  }

  if (found.length === 0) {
    for (const folder of folders) {
      for (const module of ['album-proofer', 'smart-album']) {
        const prefix = `users/${folder}/${module}/`;
        for (const obj of await listObjectsByPrefix(prefix, 3000)) {
          if (!obj.key.includes(albumId)) continue;
          if (seen.has(obj.key) || !isLikelyAlbumImageKey(obj.key)) continue;
          seen.add(obj.key);
          found.push(obj);
        }
      }
    }
  }

  if (found.length === 0) {
    for (const obj of await listObjectsByPrefix('users/', 8000)) {
      if (!obj.key.includes(albumId)) continue;
      if (!obj.key.includes('/album-proofer/') && !obj.key.includes('/smart-album/')) continue;
      if (seen.has(obj.key) || !isLikelyAlbumImageKey(obj.key)) continue;
      seen.add(obj.key);
      found.push(obj);
    }
  }

  found.sort((a, b) => {
    const ka = storagePathSortKey(a.key);
    const kb = storagePathSortKey(b.key);
    if (ka && kb) return ka[0] - kb[0] || ka[1] - kb[1];
    return a.key.localeCompare(b.key);
  });

  return found.map((obj, index) => collectionItemFromKey(obj.key, index, obj.size, publicUrl));
}

function pagesNeedCatalog(pages = {}) {
  return Object.keys(pages).some((key) => {
    const stored = pages[key];
    return (
      stored &&
      typeof stored === 'object' &&
      stored.collectionItemId &&
      !stored.storagePath &&
      !stored.dataUrl
    );
  });
}

function remapPagesToCollection(pages = {}, collection = []) {
  if (!collection.length) return { pages, remapped: 0 };

  const known = new Set(collection.map((item) => item.id).filter(Boolean));
  const orphanOrder = [];
  const orphanSeen = new Set();
  let resolved = 0;

  for (const key of Object.keys(pages)) {
    const stored = pages[key];
    if (!stored || typeof stored !== 'object' || !stored.collectionItemId) continue;
    if (known.has(stored.collectionItemId)) {
      resolved += 1;
      continue;
    }
    if (!orphanSeen.has(stored.collectionItemId)) {
      orphanSeen.add(stored.collectionItemId);
      orphanOrder.push(stored.collectionItemId);
    }
  }

  const idMap = new Map();
  if (resolved === 0 && orphanOrder.length > 0) {
    orphanOrder.forEach((oldId, index) => {
      if (collection[index]?.id) idMap.set(oldId, collection[index].id);
    });
  }

  let remapped = 0;
  const next = {};
  for (const key of Object.keys(pages)) {
    const stored = pages[key];
    if (!stored || typeof stored !== 'object' || !stored.collectionItemId) {
      next[key] = stored;
      continue;
    }
    const newId = idMap.get(stored.collectionItemId) || stored.collectionItemId;
    const item = collection.find((entry) => entry.id === newId);
    if (newId !== stored.collectionItemId || (item && (!stored.storagePath || !stored.dataUrl))) {
      remapped += 1;
    }
    next[key] = {
      collectionItemId: newId,
      ...(item?.storagePath || stored.storagePath
        ? { storagePath: item?.storagePath || stored.storagePath }
        : {}),
      ...(item?.dataUrl || stored.dataUrl
        ? { dataUrl: item?.dataUrl || stored.dataUrl }
        : {}),
    };
  }

  return { pages: next, remapped };
}

function deriveCoverUrl(pages, collection) {
  const spread0 = pages['spread:0'];
  if (spread0?.dataUrl) return spread0.dataUrl;
  if (pages['0']?.dataUrl) return pages['0'].dataUrl;
  if (pages['1']?.dataUrl) return pages['1'].dataUrl;
  return collection[0]?.dataUrl || null;
}

function albumPreviewNeedsRepair(preview) {
  const pd = preview && typeof preview === 'object' ? preview : {};
  const collection = Array.isArray(pd.collection) ? pd.collection : [];
  const pages = pd.pages && typeof pd.pages === 'object' ? pd.pages : {};
  const pageKeys = Object.keys(pages);
  const hasPaths = collection.some((item) => item?.storagePath);
  if (pageKeys.length === 0 && collection.length === 0) return false;
  if (pageKeys.length > 0 && collection.length === 0) return true;
  if (pageKeys.length > 0 && !hasPaths) return true;
  return pagesNeedCatalog(pages);
}

/**
 * Rebuild album preview collection from R2 and remap id-only page placements.
 * Persists when the caller is the album owner (or service role is available).
 *
 * body.albumId — repair one album
 * body.repairAllMine — repair every broken album owned by the authenticated photographer
 */
export async function handleRepairAlbumPreviewRequest(req, body = {}) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const userClient = getSupabaseUserClient(authHeader);
  const admin = getSupabaseAdmin();
  const anon = getAnonClient();

  let userId = null;
  if (userClient) {
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user?.id) userId = data.user.id;
  }

  if (body?.repairAllMine) {
    if (!userId || !userClient) throw new Error('Unauthorized');
    return repairAllAlbumsForPhotographer({
      photographerId: userId,
      db: admin || userClient,
      persist: true,
    });
  }

  const albumId = body?.albumId;
  if (!albumId) throw new Error('albumId or repairAllMine is required.');

  // Prefer owner-scoped read, then admin, then anon (published albums).
  let album = null;
  if (userClient && userId) {
    const { data, error } = await userClient
      .from('album_proofer_albums')
      .select('id, photographer_id, name, status, preview_data, cover_image_url, storage_bytes')
      .eq('id', albumId)
      .eq('photographer_id', userId)
      .maybeSingle();
    if (error) throw error;
    album = data;
  }

  if (!album && admin) {
    const { data, error } = await admin
      .from('album_proofer_albums')
      .select('id, photographer_id, name, status, preview_data, cover_image_url, storage_bytes')
      .eq('id', albumId)
      .maybeSingle();
    if (error) throw error;
    album = data;
  }

  if (!album && anon) {
    const { data, error } = await anon
      .from('album_proofer_albums')
      .select('id, photographer_id, name, status, preview_data, cover_image_url, storage_bytes')
      .eq('id', albumId)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    album = data;
  }

  if (!album) throw new Error('Album not found.');

  const writer = admin || (userId && userId === album.photographer_id ? userClient : null);
  const photographerDb = writer || admin || userClient || anon;
  return repairAlbumRow(album, {
    persist: Boolean(writer),
    db: photographerDb,
  });
}

async function repairAllAlbumsForPhotographer({ photographerId, db, persist }) {
  const albums = [];
  let from = 0;
  const pageSize = 100;
  while (true) {
    const { data, error } = await db
      .from('album_proofer_albums')
      .select('id, photographer_id, name, status, preview_data, cover_image_url, storage_bytes')
      .eq('photographer_id', photographerId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    albums.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const results = [];
  let repaired = 0;
  let persisted = 0;
  let skipped = 0;
  let failed = 0;

  for (const album of albums) {
    if (!albumPreviewNeedsRepair(album.preview_data)) {
      skipped += 1;
      results.push({ albumId: album.id, name: album.name, repaired: false, skipped: true });
      continue;
    }
    try {
      const result = await repairAlbumRow(album, { persist, db });
      if (result.repaired) repaired += 1;
      if (result.persisted) persisted += 1;
      results.push({
        albumId: album.id,
        name: album.name,
        repaired: result.repaired,
        persisted: result.persisted,
        collectionCount: result.collectionCount,
        pageCount: result.pageCount,
        warning: result.warning || null,
      });
    } catch (err) {
      failed += 1;
      results.push({
        albumId: album.id,
        name: album.name,
        repaired: false,
        error: err?.message || String(err),
      });
    }
  }

  return {
    repairAllMine: true,
    photographerId,
    totalAlbums: albums.length,
    repaired,
    persisted,
    skipped,
    failed,
    results,
  };
}

async function repairAlbumRow(album, { persist, db }) {
  const preview = album.preview_data && typeof album.preview_data === 'object' ? album.preview_data : {};
  const existingCollection = Array.isArray(preview.collection) ? preview.collection : [];
  const existingPages = preview.pages && typeof preview.pages === 'object' ? preview.pages : {};
  const needsRepair =
    existingCollection.length === 0 ||
    !existingCollection.some((item) => item?.storagePath) ||
    pagesNeedCatalog(existingPages);

  if (!needsRepair) {
    return {
      repaired: false,
      persisted: false,
      collectionCount: existingCollection.length,
      pageCount: Object.keys(existingPages).length,
      preview_data: preview,
      cover_image_url: album.cover_image_url || preview.cover_url || null,
    };
  }

  const { data: photographer } = await db
    .from('photographers')
    .select('id, display_name, email')
    .eq('id', album.photographer_id)
    .maybeSingle();

  // Anon may not read photographers — fall back to album name only.
  const collection = await listAlbumR2Collection(album.id, {
    id: album.photographer_id,
    display_name: photographer?.display_name || null,
    email: photographer?.email || null,
    albumName: album.name,
  });

  if (!collection.length) {
    return {
      repaired: false,
      persisted: false,
      collectionCount: 0,
      pageCount: Object.keys(existingPages).length,
      preview_data: preview,
      cover_image_url: album.cover_image_url || null,
      warning: 'No R2 objects found for this album.',
    };
  }

  const { pages, remapped } = remapPagesToCollection(existingPages, collection);
  const cover_url = deriveCoverUrl(pages, collection);
  const preview_data = {
    ...preview,
    version: preview.version || 2,
    updated_at: new Date().toISOString(),
    collection,
    pages,
    storage_bytes: collection.reduce((sum, item) => sum + (Number(item.size_bytes) || 0), 0),
    revision: Date.now(),
    cover_url,
  };

  let persisted = false;
  if (persist && db) {
    const { data, error } = await db
      .from('album_proofer_albums')
      .update({
        preview_data,
        cover_image_url: cover_url,
        storage_bytes: preview_data.storage_bytes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', album.id)
      .eq('photographer_id', album.photographer_id)
      .select('id, preview_data, cover_image_url')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('Could not persist repaired preview_data (RLS or ownership).');
    }
    persisted = true;
  }

  return {
    repaired: true,
    persisted,
    collectionCount: collection.length,
    pageCount: Object.keys(pages).length,
    remapped,
    preview_data,
    cover_image_url: cover_url,
  };
}
