import { supabase } from '../lib/supabase/client';
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

export function getImageLimit(profile) {
  return Number(profile?.image_limit) === -1 ? -1 : asLimit(profile?.image_limit);
}

export function getFaceMatchingDeliveryLimit(profile) {
  return Number(profile?.face_matching_delivery_limit) === -1 ? -1 : asLimit(profile?.face_matching_delivery_limit);
}

export function isFaceRecognitionEnabled(profile) {
  return Number(profile?.image_limit) !== -1;
}

export function isFaceMatchingDeliveryEnabled(profile) {
  return Number(profile?.face_matching_delivery_limit) !== -1;
}

export function formatCountMeter(used, limit) {
  const cap = Number(limit);
  if (cap === -1) return 'Disabled';
  const usedCount = asUsed(used);
  if (cap > 0) return `${usedCount.toLocaleString()} / ${cap.toLocaleString()}`;
  return `${usedCount.toLocaleString()} / Unlimited`;
}

export function quotaPercent(used, limit) {
  const cap = Number(limit);
  if (cap <= 0) return 0;
  return Math.min(100, (asUsed(used) / cap) * 100);
}

function quotaError(kind, used, limit) {
  const cap = Number(limit);
  if (cap === -1) {
    if (kind === 'image') {
      return new Error('Face recognition image processing is disabled for this account. Ask an admin to enable your face recognition permission.');
    }
    return new Error('Face matching delivery is disabled for this account. Ask an admin to enable this permission.');
  }

  const remaining = Math.max(0, asLimit(limit) - asUsed(used));
  if (kind === 'image') {
    return new Error(
      remaining < 1
        ? `Face recognition image limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()} images). Ask an admin to raise your face recognition limit.`
        : `Face recognition image limit exceeded. You can process ${remaining.toLocaleString()} more image${remaining === 1 ? '' : 's'} for face recognition.`
    );
  }
  return new Error(
    remaining < 1
      ? `Face matching delivery limit reached (${asUsed(used).toLocaleString()} / ${asLimit(limit).toLocaleString()}). Ask an admin to raise this limit.`
      : `Face matching delivery limit exceeded. You can create ${remaining.toLocaleString()} more face-matching ${remaining === 1 ? 'delivery' : 'deliveries'}.`
  );
}

export const photographerQuotaService = {
  notifyQuotaChanged() {
    userStorageService.notifyStorageChanged();
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
  },

  async fetchSnapshot(photographerId) {
    if (!photographerId) {
      return {
        image_used_count: 0,
        image_limit: 0,
        face_matching_delivery_used: 0,
        face_matching_delivery_limit: 0,
      };
    }

    const existing = quotaCache.get(photographerId);
    if (existing && Date.now() - existing.time < 8000) {
      return existing.data;
    }

    const { data, error } = await supabase
      .from('photographers')
      .select('image_used_count, image_limit, face_matching_delivery_used, face_matching_delivery_limit')
      .eq('id', photographerId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '');
      if (/image_limit|image_used_count|face_matching_delivery/i.test(msg) || error.code === '42703') {
        const fallback = {
          image_used_count: 0,
          image_limit: 0,
          face_matching_delivery_used: 0,
          face_matching_delivery_limit: 0,
        };
        quotaCache.set(photographerId, { data: fallback, time: Date.now() });
        return fallback;
      }
      throw error;
    }

    const snapshot = {
      image_used_count: asUsed(data?.image_used_count),
      image_limit: Number(data?.image_limit) === -1 ? -1 : asLimit(data?.image_limit),
      face_matching_delivery_used: asUsed(data?.face_matching_delivery_used),
      face_matching_delivery_limit: Number(data?.face_matching_delivery_limit) === -1 ? -1 : asLimit(data?.face_matching_delivery_limit),
    };
    quotaCache.set(photographerId, { data: snapshot, time: Date.now() });
    return snapshot;
  },

  invalidate(photographerId) {
    if (photographerId) quotaCache.delete(photographerId);
  },

  async assertImageQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    const limit = snapshot.image_limit;
    if (limit === -1) throw quotaError('image', snapshot.image_used_count, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.image_used_count + Math.max(0, addCount);
    if (next > limit) throw quotaError('image', snapshot.image_used_count, limit);
    return snapshot;
  },

  async assertFaceMatchingDeliveryQuota(photographerId, addCount = 1) {
    const snapshot = await this.fetchSnapshot(photographerId);
    const limit = snapshot.face_matching_delivery_limit;
    if (limit === -1) throw quotaError('face', snapshot.face_matching_delivery_used, -1);
    if (limit <= 0) return snapshot;
    const next = snapshot.face_matching_delivery_used + Math.max(0, addCount);
    if (next > limit) throw quotaError('face', snapshot.face_matching_delivery_used, limit);
    return snapshot;
  },
};
