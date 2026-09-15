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

// Legacy (kept for backward compat) — image_limit is now the combined total.
export function getImageLimit(profile) {
  if (profile?.face_normal_image_limit != null || profile?.face_guest_image_limit != null) {
    return asLimit(profile?.face_normal_image_limit) + asLimit(profile?.face_guest_image_limit);
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
  if (profile?.face_guest_image_limit != null) return asTriState(profile.face_guest_image_limit);
  return Number(profile?.image_limit) === -1 ? -1 : asLimit(profile?.image_limit);
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
export function isNormalFeatureEnabled(profile) {
  if (profile?.face_normal_enabled === false) return false;
  return true;
}

export function isGuestFeatureEnabled(profile) {
  if (profile?.face_guest_enabled === false) return false;
  return true;
}

// AI search master switch (Photo Library). Default true for legacy rows
// and for DBs where the migration has not been applied yet.
export function isAiSearchEnabled(profile) {
  if (profile?.ai_search_enabled === false) return false;
  return true;
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
        ? `Normal delivery face image limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()} images). Ask an admin to raise your normal delivery limit.`
        : `Normal delivery face image limit exceeded. You can process ${remaining.toLocaleString()} more image${remaining === 1 ? '' : 's'}.`
    );
  }
  if (kind === 'guest-image') {
    return new Error(
      remaining < 1
        ? `Guest delivery face image limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()} images). Ask an admin to raise your guest delivery limit.`
        : `Guest delivery face image limit exceeded. You can process ${remaining.toLocaleString()} more image${remaining === 1 ? '' : 's'}.`
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
    face_guest_image_limit: data?.face_guest_image_limit != null ? asTriState(data.face_guest_image_limit) : asLimit(data?.image_limit),
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
    face_normal_enabled: data?.face_normal_enabled === false ? false : true,
    face_guest_enabled: data?.face_guest_enabled === false ? false : true,
    ai_search_enabled: data?.ai_search_enabled === false ? false : true,
    album_limit: data?.album_limit != null ? asTriState(data.album_limit) : 0,
    album_used_count: asUsed(data?.album_used_count),
    delivery_limit: data?.delivery_limit != null ? asTriState(data.delivery_limit) : 0,
    delivery_used_count: asUsed(data?.delivery_used_count ?? data?.face_normal_delivery_used),
  };
  return snap;
}

export const photographerQuotaService = {
  notifyQuotaChanged() {
    userStorageService.notifyStorageChanged();
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
  },

  async fetchSnapshot(photographerId) {
    if (!photographerId) {
      return emptySnapshot();
    }

    const existing = quotaCache.get(photographerId);
    if (existing && Date.now() - existing.time < 8000) {
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
  },

  async assertImageQuota(photographerId, addCount = 1) {
    // Legacy: check combined — routes to normal for backward compat.
    return this.assertNormalImageQuota(photographerId, addCount);
  },

  async assertNormalImageQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (snapshot.face_normal_enabled === false) throw quotaError('normal-image', snapshot.face_normal_image_used, -1);
    const limit = snapshot.face_normal_image_limit;
    if (limit === -1) throw quotaError('normal-image', snapshot.face_normal_image_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_normal_image_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('normal-image', snapshot.face_normal_image_used, limit);
    return snapshot;
  },

  async assertGuestImageQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (snapshot.face_guest_enabled === false) throw quotaError('guest-image', snapshot.face_guest_image_used, -1);
    const limit = snapshot.face_guest_image_limit;
    if (limit === -1) throw quotaError('guest-image', snapshot.face_guest_image_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_guest_image_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('guest-image', snapshot.face_guest_image_used, limit);
    return snapshot;
  },

  async assertFaceMatchingDeliveryQuota(photographerId, addCount = 1) {
    // Legacy: guest delivery quota.
    return this.assertGuestDeliveryQuota(photographerId, addCount);
  },

  async assertNormalDeliveryQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (snapshot.face_normal_enabled === false) throw quotaError('normal-face', snapshot.face_normal_delivery_used, -1);
    const limit = snapshot.face_normal_delivery_limit;
    if (limit === -1) throw quotaError('normal-face', snapshot.face_normal_delivery_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_normal_delivery_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('normal-face', snapshot.face_normal_delivery_used, limit);
    return snapshot;
  },

  async assertGuestDeliveryQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    if (snapshot.face_guest_enabled === false) throw quotaError('face', snapshot.face_guest_delivery_used, -1);
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
