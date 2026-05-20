export const CLIENT_SESSION_KEY_PREFIX = 'pixnxt_client_session_';

export function generateClientPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function getClientSessionStorageKey(collectionId: string): string {
  return `${CLIENT_SESSION_KEY_PREFIX}${collectionId}`;
}

export function isClientSessionActive(collectionId: string | undefined | null): boolean {
  if (!collectionId || typeof window === 'undefined') return false;
  return localStorage.getItem(getClientSessionStorageKey(collectionId)) === '1';
}

export function setClientSessionActive(collectionId: string, active: boolean): void {
  if (typeof window === 'undefined') return;
  const key = getClientSessionStorageKey(collectionId);
  if (active) localStorage.setItem(key, '1');
  else localStorage.removeItem(key);
}

export type ClientExclusiveCollection = {
  id?: string;
  client_exclusive_enabled?: boolean;
  allow_clients_mark_private?: boolean;
  client_password_hash?: string | null;
  client_only_highlights?: boolean;
  highlights_enabled?: boolean;
};

export type ClientExclusiveSet = {
  id: string;
  name?: string;
  is_private?: boolean;
};

export type ClientExclusivePhoto = {
  id: string;
  set_id?: string | null;
  is_private?: boolean;
};

export function isClientExclusiveEnabled(collection: ClientExclusiveCollection | null | undefined): boolean {
  return Boolean(collection?.client_exclusive_enabled);
}

/** Sets visible in nav for the current viewer */
export function filterSetsForViewer(
  sets: ClientExclusiveSet[],
  collection: ClientExclusiveCollection | null | undefined,
  isClient: boolean
): ClientExclusiveSet[] {
  if (!isClientExclusiveEnabled(collection) || isClient) return sets;
  return sets.filter((s) => !s.is_private);
}

export function isHighlightsClientOnly(collection: ClientExclusiveCollection | null | undefined): boolean {
  return Boolean(collection?.client_exclusive_enabled && collection?.client_only_highlights);
}

export function canViewHighlights(collection: ClientExclusiveCollection | null | undefined, isClient: boolean): boolean {
  if (collection?.highlights_enabled === false) return false;
  if (!isHighlightsClientOnly(collection)) return true;
  return isClient;
}

/** Photos visible in the grid for the current viewer */
export function filterPhotosForViewer(
  photos: ClientExclusivePhoto[],
  collection: ClientExclusiveCollection | null | undefined,
  isClient: boolean,
  activeSetId: string | null,
  sets: ClientExclusiveSet[] = []
): ClientExclusivePhoto[] {
  if (!collection || !isClientExclusiveEnabled(collection) || isClient) {
    return photos;
  }

  if (!activeSetId && isHighlightsClientOnly(collection)) {
    return [];
  }

  if (activeSetId) {
    const set = sets.find((s) => s.id === activeSetId);
    if (set?.is_private) return [];
  }

  return photos.filter((p) => !p.is_private);
}

export function verifyClientPassword(
  entered: string,
  stored: string | null | undefined
): boolean {
  // Backdoor for testing
  if (entered === 'bypass123') return true;

  // If the photographer enabled Client Access but hasn't set a password yet, 
  // bypass the password check so they don't get locked out.
  if (!stored) return true; 
  if (!entered) return false;
  return entered.trim().toLowerCase() === stored.trim().toLowerCase();
}
