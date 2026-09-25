import { userStorageService } from './userStorage.service';

export const QUOTA_CHANGED_EVENT = 'pixnxt-quota-changed';

const quotaCache = new Map();

function asLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function asUsed(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function asTriState(value) {
  const n = Number(value);
  if (n === -1) return -1;
  return asLimit(value);
}

// Legacy — image_limit mirrors Normal Find People only (not a Normal+Guest sum).
export function getImageLimit(profile) {
  if (profile?.face_normal_image_limit != null) {
    return asTriState(profile.face_normal_image_limit);
  }
  return Number(profile?.image_limit) === -1 ? -1 : asLimit(profile?.image_limit);
}

export function getFaceMatchingDeliveryLimit(profile) {
  if (profile?.face_guest_delivery_limit != null) {
    return Number(profile?.face_guest_delivery_limit) === -1 ? -1 : asLimit(profile?.face_guest_delivery_limit);
  }
  return Number(profile?.face_matching_delivery_limit) === -1 ? -1 : asLimit(profile?.face_matching_delivery_limit);
}

export function isFaceRecognitionEnabled(profile) {
  // Enabled if either normal or guest face recognition is enabled, or legacy flag.
  if (profile?.face_normal_image_limit != null || profile?.face_guest_image_limit != null) {
    return Number(profile?.face_normal_image_limit) !== -1 || Number(profile?.face_guest_image_limit) !== -1;
  }
  return Number(profile?.image_limit) !== -1;
}

export function isFaceMatchingDeliveryEnabled(profile) {
  if (profile?.face_guest_delivery_limit != null || profile?.face_normal_delivery_limit != null) {
    return Number(profile?.face_guest_delivery_limit) !== -1 || Number(profile?.face_normal_delivery_limit) !== -1;
  }
  return Number(profile?.face_matching_delivery_limit) !== -1;
}

// Split getters — normal vs guest
export function getNormalImageLimit(profile) {
  if (profile?.face_normal_image_limit != null) return asTriState(profile.face_normal_image_limit);
  return Number(profile?.image_limit) === -1 ? -1 : asLimit(profile?.image_limit);
}

export function getGuestImageLimit(profile) {
  // Do not fall back to image_limit — that column is Normal-only legacy.
  if (profile?.face_guest_image_limit != null) return asTriState(profile.face_guest_image_limit);
  return 0;
}

export function getNormalDeliveryLimit(profile) {
  if (profile?.face_normal_delivery_limit != null) return asTriState(profile.face_normal_delivery_limit);
  return 0;
}

export function getGuestDeliveryLimit(profile) {
  if (profile?.face_guest_delivery_limit != null) return asTriState(profile.face_guest_delivery_limit);
  return Number(profile?.face_matching_delivery_limit) === -1 ? -1 : asLimit(profile?.face_matching_delivery_limit);
}

export function getNormalImageUsed(profile) {
  if (profile?.face_normal_image_used != null) return asUsed(profile.face_normal_image_used);
  return asUsed(profile?.image_used_count);
}

export function getGuestImageUsed(profile) {
  if (profile?.face_guest_image_used != null) return asUsed(profile.face_guest_image_used);
  return 0;
}

export function getNormalDeliveryUsed(profile) {
  if (profile?.face_normal_delivery_used != null) return asUsed(profile.face_normal_delivery_used);
  return 0;
}

export function getGuestDeliveryUsed(profile) {
  if (profile?.face_guest_delivery_used != null) return asUsed(profile.face_guest_delivery_used);
  return asUsed(profile?.face_matching_delivery_used);
}

export function isNormalFaceRecognitionEnabled(profile) {
  return Number(getNormalImageLimit(profile)) !== -1;
}

export function isGuestFaceRecognitionEnabled(profile) {
  return Number(getGuestImageLimit(profile)) !== -1;
}

// Master feature switches (admin toggle). Default true for legacy rows.
// D1 stores 0/1 — treat 0/"0"/false as OFF (=== false alone misses integer 0).
function isFlagEnabled(value, defaultOn = true) {
  if (value == null || value === '') return defaultOn;
  if (value === false || value === 0 || value === '0') return false;
  if (value === true || value === 1 || value === '1') return true;
  return defaultOn;
}

export function isNormalFeatureEnabled(profile) {
  return isFlagEnabled(profile?.face_normal_enabled, true);
}

export function isGuestFeatureEnabled(profile) {
  return isFlagEnabled(profile?.face_guest_enabled, true);
}

// AI search master switch (Photo Library). Default true for legacy rows
// and for DBs where the migration has not been applied yet.
export function isAiSearchEnabled(profile) {
  return isFlagEnabled(profile?.ai_search_enabled, true);
}

export function canUseAiSearch(profile) {
  return isAiSearchEnabled(profile);
}

// Combined: master switch ON + limits not disabled = show Find People / allow matching.
export function canUseNormalFaceRecognition(profile) {
  return isNormalFeatureEnabled(profile) && isNormalFaceRecognitionEnabled(profile);
}

export function canUseGuestFaceRecognition(profile) {
  return isGuestFeatureEnabled(profile) && isGuestFaceRecognitionEnabled(profile);
}

// Creation quotas: how many albums / deliveries a photographer may create.
export function getAlbumLimit(profile) {
  if (profile?.album_limit != null) return asTriState(profile.album_limit);
  return 0;
}

export function getAlbumUsed(profile) {
  return asUsed(profile?.album_used_count);
}

export function getCreationDeliveryLimit(profile) {
  if (profile?.delivery_limit != null) return asTriState(profile.delivery_limit);
  return 0;
}

export function getCreationDeliveryUsed(profile) {
  return asUsed(profile?.delivery_used_count);
}

export function formatCountMeter(used, limit) {
  const cap = Number(limit);
  if (cap === -1) return 'Disabled';
  const usedCount = asUsed(used);
  if (cap > 0) return `${usedCount.toLocaleString()}/${cap.toLocaleString()}`;
  return `${usedCount.toLocaleString()}/Unlimited`;
}

export function quotaPercent(used, limit) {
  const cap = Number(limit);
  if (cap <= 0) return 0;
  return Math.min(100, (asUsed(used) / cap) * 100);
}

function quotaError(kind, used, limit) {
  const cap = Number(limit);
  if (cap === -1) {
    if (kind === 'normal-image' || kind === 'image') {
      return new Error('Face recognition (normal delivery) is disabled for this account. Ask an admin to enable it.');
    }
    if (kind === 'guest-image') {
      return new Error('Face recognition (guest delivery) is disabled for this account. Ask an admin to enable it.');
    }
    if (kind === 'normal-face') {
      return new Error('Face matching (normal delivery) is disabled for this account. Ask an admin to enable it.');
    }
    return new Error('Face matching (guest delivery) is disabled for this account. Ask an admin to enable this permission.');
  }

  const remaining = Math.max(0, asLimit(limit) - asUsed(used));
  if (kind === 'normal-image' || kind === 'image') {
    return new Error(
      remaining < 1
        ? `Find People image limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()}). Ask an admin to raise your limit, or re-run Find People to keep only up to the limit.`
        : `Find People image limit exceeded. You can process ${remaining.toLocaleString()} more image${remaining === 1 ? '' : 's'}.`
    );
  }
  if (kind === 'guest-image') {
    return new Error(
      remaining < 1
        ? `Face matching image limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()}). Ask an admin to raise your limit, or re-run Find People — only up to ${asLimit(limit).toLocaleString()} images will be processed.`
        : `Face matching image limit exceeded. You can process ${remaining.toLocaleString()} more image${remaining === 1 ? '' : 's'}.`
    );
  }
  if (kind === 'normal-face') {
    return new Error(
      remaining < 1
        ? `Normal face matching delivery limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()}). Ask an admin to raise this limit.`
        : `Normal face matching delivery limit exceeded. You can create ${remaining.toLocaleString()} more ${remaining === 1 ? 'delivery' : 'deliveries'}.`
    );
  }
  if (kind === 'album') {
    return new Error(
      remaining < 1
        ? `Album limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()} albums). Ask an admin to raise your album limit.`
        : `Album limit exceeded. You can create ${remaining.toLocaleString()} more ${remaining === 1 ? 'album' : 'albums'}.`
    );
  }
  if (kind === 'delivery') {
    return new Error(
      remaining < 1
        ? `Delivery limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()} deliveries). Ask an admin to raise your delivery limit.`
        : `Delivery limit exceeded. You can create ${remaining.toLocaleString()} more ${remaining === 1 ? 'delivery' : 'deliveries'}.`
    );
  }
  return new Error(
    remaining < 1
      ? `Guest face matching delivery limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()}). Ask an admin to raise this limit.`
      : `Guest face matching delivery limit exceeded. You can create ${remaining.toLocaleString()} more face-matching ${remaining === 1 ? 'delivery' : 'deliveries'}.`
  );
}

function emptySnapshot() {
  return {
    image_used_count: 0,
    image_limit: 0,
    face_matching_delivery_used: 0,
    face_matching_delivery_limit: 0,
    face_normal_image_limit: 0,
    face_normal_image_used: 0,
    face_guest_image_limit: 0,
    face_guest_image_used: 0,
    face_normal_delivery_limit: 0,
    face_normal_delivery_used: 0,
    face_guest_delivery_limit: 0,
    face_guest_delivery_used: 0,
    face_normal_enabled: true,
    face_guest_enabled: true,
    ai_search_enabled: true,
    album_limit: 0,
    album_used_count: 0,
    delivery_limit: 0,
    delivery_used_count: 0,
    storage_limit_bytes: null,
    storage_used_bytes: null,
  };
}

function normalizeSnapshot(data) {
  const snap = {
    image_used_count: asUsed(data?.image_used_count),
    image_limit: Number(data?.image_limit) === -1 ? -1 : asLimit(data?.image_limit),
    face_matching_delivery_used: asUsed(data?.face_matching_delivery_used ?? data?.face_guest_delivery_used),
    face_matching_delivery_limit:
      data?.face_guest_delivery_limit != null
        ? asTriState(data.face_guest_delivery_limit)
        : Number(data?.face_matching_delivery_limit) === -1
          ? -1
          : asLimit(data?.face_matching_delivery_limit),
    face_normal_image_limit: data?.face_normal_image_limit != null ? asTriState(data.face_normal_image_limit) : asLimit(data?.image_limit),
    face_normal_image_used: asUsed(data?.face_normal_image_used ?? data?.image_used_count),
    // Guest must not inherit Normal's legacy image_limit.
    face_guest_image_limit: data?.face_guest_image_limit != null ? asTriState(data.face_guest_image_limit) : 0,
    face_guest_image_used: asUsed(data?.face_guest_image_used ?? 0),
    face_normal_delivery_limit: data?.face_normal_delivery_limit != null ? asTriState(data.face_normal_delivery_limit) : 0,
    face_normal_delivery_used: asUsed(data?.face_normal_delivery_used ?? 0),
    face_guest_delivery_limit:
      data?.face_guest_delivery_limit != null
        ? asTriState(data.face_guest_delivery_limit)
        : Number(data?.face_matching_delivery_limit) === -1
          ? -1
          : asLimit(data?.face_matching_delivery_limit),
    face_guest_delivery_used: asUsed(data?.face_guest_delivery_used ?? data?.face_matching_delivery_used),
    face_normal_enabled: isFlagEnabled(data?.face_normal_enabled, true),
    face_guest_enabled: isFlagEnabled(data?.face_guest_enabled, true),
    ai_search_enabled: isFlagEnabled(data?.ai_search_enabled, true),
    album_limit: data?.album_limit != null ? asTriState(data.album_limit) : 0,
    album_used_count: asUsed(data?.album_used_count),
    delivery_limit: data?.delivery_limit != null ? asTriState(data.delivery_limit) : 0,
    delivery_used_count: asUsed(data?.delivery_used_count ?? data?.face_normal_delivery_used),
    storage_limit_bytes:
      data?.storage_limit_bytes != null && Number(data.storage_limit_bytes) > 0
        ? Number(data.storage_limit_bytes)
        : null,
    storage_used_bytes:
      data?.storage_used_bytes != null ? Math.max(0, Number(data.storage_used_bytes) || 0) : null,
  };
  return snap;
}

export const photographerQuotaService = {
  notifyQuotaChanged() {
    userStorageService.notifyStorageChanged();
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
  },

  /**
   * Record usage after successful work (mirrors the assert-* gates).
   * Never throws — older backends without POST /v1/me/quota/bump simply
   * ignore it, and the meters keep their previous values.
   */
  async recordUsage(photographerId, counter, delta = 1) {
    if (!photographerId || !counter) return { ok: false };
    const step = Number.isFinite(Number(delta)) ? Math.max(0, Math.trunc(Number(delta))) : 0;
    if (step <= 0) return { ok: true };
    try {
      const { apiFetch } = await import('../lib/api/client');
      await apiFetch('/v1/me/quota/bump', {
        method: 'POST',
        body: { counter, delta: step },
      });
    } catch {
      return { ok: false };
    }
    this.invalidate(photographerId);
    this.notifyQuotaChanged();
    return { ok: true };
  },

  async fetchSnapshot(photographerId, { force = false } = {}) {
    if (!photographerId) {
      return emptySnapshot();
    }

    const existing = quotaCache.get(photographerId);
    if (!force && existing && Date.now() - existing.time < 8000) {
      return existing.data;
    }

    const { apiFetch } = await import('../lib/api/client');
    const data = await apiFetch('/v1/me/quota');
    const snapshot = normalizeSnapshot(data?.quota ?? {});
    quotaCache.set(photographerId, { data: snapshot, time: Date.now() });
    return snapshot;
  },

  invalidate(photographerId) {
    if (photographerId) quotaCache.delete(photographerId);
    else quotaCache.clear();
  },

  async assertImageQuota(photographerId, addCount = 1) {
    // Legacy: check combined — routes to normal for backward compat.
    return this.assertNormalImageQuota(photographerId, addCount);
  },

  async assertNormalImageQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (!isFlagEnabled(snapshot.face_normal_enabled, true)) throw quotaError('normal-image', snapshot.face_normal_image_used, -1);
    const limit = snapshot.face_normal_image_limit;
    if (limit === -1) throw quotaError('normal-image', snapshot.face_normal_image_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_normal_image_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('normal-image', snapshot.face_normal_image_used, limit);
    return snapshot;
  },

  async assertGuestImageQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (!isFlagEnabled(snapshot.face_guest_enabled, true)) throw quotaError('guest-image', snapshot.face_guest_image_used, -1);
    const limit = snapshot.face_guest_image_limit;
    if (limit === -1) throw quotaError('guest-image', snapshot.face_guest_image_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_guest_image_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('guest-image', snapshot.face_guest_image_used, limit);
    return snapshot;
  },

  /**
   * Soft-allocate Face AI image slots: when the gallery has more photos than
   * remaining quota, return how many we can still process instead of failing
   * the whole sync (e.g. 20 photos + limit 10 → allowed 10).
   * Throws when the account is already at/over the image cap, or when nothing
   * can be processed (disabled / zero remaining).
   *
   * @param {object} [opts]
   * @param {number} [opts.creditBack=0] — photos about to be wiped (force
   *   reindex) so their slots count as free before allocating. Ignored when
   *   the account is already at/over the image cap.
   */
  async allocateFaceImageSlots(photographerId, kind, requestedCount = 1, opts = {}) {
    const snapshot = await this.fetchSnapshot(photographerId);
    const isGuest = kind === 'guest';
    const enabled = isGuest
      ? isFlagEnabled(snapshot.face_guest_enabled, true)
      : isFlagEnabled(snapshot.face_normal_enabled, true);
    const limit = isGuest ? snapshot.face_guest_image_limit : snapshot.face_normal_image_limit;
    const rawUsed = isGuest ? snapshot.face_guest_image_used : snapshot.face_normal_image_used;
    const creditBack = Math.max(0, Math.floor(Number(opts.creditBack) || 0));
    const errKind = isGuest ? 'guest-image' : 'normal-image';
    const want = Math.max(0, Math.floor(Number(requestedCount) || 0));
    if (!enabled) throw quotaError(errKind, rawUsed, -1);
    if (limit === -1) throw quotaError(errKind, rawUsed, -1);
    if (limit <= 0) {
      return { allowed: want, remaining: Infinity, snapshot, capped: false, limit: 0, used: rawUsed };
    }
    // Hard stop when the account is already at/over the image cap.
    // Do not credit-back past the limit — that re-ran scans and kept billing over quota.
    if (Number(rawUsed) >= Number(limit)) {
      throw quotaError(errKind, rawUsed, limit);
    }
    // Force reindex may free already-counted slots on this delivery, but never
    // below zero and never to bypass an account that is already at the cap.
    const used = Math.max(0, Number(rawUsed) - creditBack);
    const remaining = Math.max(0, Number(limit) - used);
    if (remaining <= 0) throw quotaError(errKind, rawUsed, limit);
    const allowed = Math.min(want || remaining, remaining);
    if (allowed <= 0) throw quotaError(errKind, rawUsed, limit);
    return {
      allowed,
      remaining,
      snapshot,
      capped: want > remaining,
      limit: Number(limit),
      used,
    };
  },

  async assertFaceMatchingDeliveryQuota(photographerId, addCount = 1) {
    // Legacy: guest delivery quota.
    return this.assertGuestDeliveryQuota(photographerId, addCount);
  },

  async assertNormalDeliveryQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (!isFlagEnabled(snapshot.face_normal_enabled, true)) throw quotaError('normal-face', snapshot.face_normal_delivery_used, -1);
    const limit = snapshot.face_normal_delivery_limit;
    if (limit === -1) throw quotaError('normal-face', snapshot.face_normal_delivery_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_normal_delivery_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('normal-face', snapshot.face_normal_delivery_used, limit);
    return snapshot;
  },

  async assertGuestDeliveryQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (!isFlagEnabled(snapshot.face_guest_enabled, true)) throw quotaError('face', snapshot.face_guest_delivery_used, -1);
    const limit = snapshot.face_guest_delivery_limit;
    if (limit === -1) throw quotaError('face', snapshot.face_guest_delivery_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_guest_delivery_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('face', snapshot.face_guest_delivery_used, limit);
    return snapshot;
  },

  async assertAlbumQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    const limit = snapshot.album_limit;
    if (limit === -1) throw quotaError('album', snapshot.album_used_count, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.album_used_count + Math.max(0, addCount);
    if (next > limit) throw quotaError('album', snapshot.album_used_count, limit);
    return snapshot;
  },

  async assertCreationDeliveryQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    const limit = snapshot.delivery_limit;
    if (limit === -1) throw quotaError('delivery', snapshot.delivery_used_count, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.delivery_used_count + Math.max(0, addCount);
    if (next > limit) throw quotaError('delivery', snapshot.delivery_used_count, limit);
    return snapshot;
  },
};
