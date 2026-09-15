/**
 * Client-side R2 folder helpers (Cloudflare Workers lookups).
 * Server / Vite config code should import from photographerR2FolderCore.js instead.
 */

import { apiFetch } from './api/client';
import {
  R2_USERS_ROOT,
  R2_USER_MODULES,
  PHOTOGRAPHER_R2_FIELDS,
  safeR2PathSegment,
  emailLocalPart,
  resolvePhotographerR2Folder,
  photographerR2FolderVariants,
  buildUserModulePath,
  fetchPhotographerR2Folder,
  fetchPhotographerR2FolderVariants,
} from './photographerR2FolderCore.js';

export {
  R2_USERS_ROOT,
  R2_USER_MODULES,
  PHOTOGRAPHER_R2_FIELDS,
  safeR2PathSegment,
  emailLocalPart,
  resolvePhotographerR2Folder,
  photographerR2FolderVariants,
  buildUserModulePath,
  fetchPhotographerR2Folder,
  fetchPhotographerR2FolderVariants,
};

const folderCache = new Map();
const variantCache = new Map();

export async function getPhotographerR2Folder(photographerId) {
  if (!photographerId) return 'photographer';
  if (folderCache.has(photographerId)) return folderCache.get(photographerId);

  try {
    let data = null;
    const me = await apiFetch('/v1/me/profile').catch(() => null);
    data = me?.profile?.id === photographerId ? me.profile : null;
    if (!data) {
      const pub = await apiFetch(`/v1/public/photographer/by-id/${photographerId}`).catch(() => null);
      data = pub?.photographer ?? null;
    }
    const folder = resolvePhotographerR2Folder(data);
    folderCache.set(photographerId, folder);
    return folder;
  } catch {
    return safeR2PathSegment(photographerId, 'photographer');
  }
}

export async function getPhotographerR2FolderVariants(photographerId) {
  if (!photographerId) return ['photographer'];
  if (variantCache.has(photographerId)) return variantCache.get(photographerId);

  try {
    let data = null;
    const me = await apiFetch('/v1/me/profile').catch(() => null);
    data = me?.profile?.id === photographerId ? me.profile : null;
    if (!data) {
      const pub = await apiFetch(`/v1/public/photographer/by-id/${photographerId}`).catch(() => null);
      data = pub?.photographer ?? null;
    }
    const variants = photographerR2FolderVariants(data);
    variantCache.set(photographerId, variants);
    return variants;
  } catch {
    return [safeR2PathSegment(photographerId, 'photographer')];
  }
}
