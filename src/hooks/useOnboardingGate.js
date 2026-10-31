import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api/client';
import { profileNeedsOnboarding } from '../lib/onboarding';

/**
 * Session cache for the first-run profile gate.
 *
 * `ProtectedRoute` mounts on every navigation, so the profile status is shared
 * here instead of re-fetching `/v1/me/profile` per route. The cache is keyed by
 * user id so switching accounts cannot leak a completed state.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const statusCache = new Map();
const inflight = new Map();

function readCachedStatus(userId) {
  const entry = statusCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.checkedAt > CACHE_TTL_MS) {
    statusCache.delete(userId);
    return null;
  }
  return entry;
}

async function fetchStatus(userId) {
  if (inflight.has(userId)) return inflight.get(userId);
  const request = (async () => {
    try {
      const data = await apiFetch('/v1/me/profile');
      const needsOnboarding = profileNeedsOnboarding(data?.profile);
      statusCache.set(userId, { needsOnboarding, checkedAt: Date.now() });
      return needsOnboarding;
    } catch {
      // Fail open: a profile hiccup must never trap a signed-in photographer.
      statusCache.set(userId, { needsOnboarding: false, checkedAt: Date.now() });
      return false;
    } finally {
      inflight.delete(userId);
    }
  })();
  inflight.set(userId, request);
  return request;
}

/** Mark a user complete immediately after the onboarding PATCH succeeds. */
export function markOnboardingComplete(userId) {
  if (!userId) return;
  statusCache.set(userId, { needsOnboarding: false, checkedAt: Date.now() });
}

/** Drop cached state (e.g. after a manual profile edit / retry). */
export function invalidateOnboardingGate(userId) {
  if (userId) {
    statusCache.delete(userId);
    inflight.delete(userId);
    return;
  }
  statusCache.clear();
  inflight.clear();
}

/**
 * @param {string|null|undefined} userId - Skip the check entirely when null.
 * @returns {{ checking: boolean, needsOnboarding: boolean }}
 */
export function useOnboardingGate(userId) {
  const [result, setResult] = useState(() => ({
    userId: userId ?? null,
    resolved: !userId,
    needsOnboarding: false,
  }));

  useEffect(() => {
    if (!userId) return undefined;
    if (readCachedStatus(userId)) return undefined;

    let cancelled = false;
    fetchStatus(userId)
      .then((needsOnboarding) => {
        if (cancelled) return;
        setResult({ userId, resolved: true, needsOnboarding });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ userId, resolved: true, needsOnboarding: false });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return { checking: false, needsOnboarding: false };

  const cached = readCachedStatus(userId);
  if (cached) return { checking: false, needsOnboarding: cached.needsOnboarding };

  if (result.userId === userId && result.resolved) {
    return { checking: false, needsOnboarding: result.needsOnboarding };
  }

  return { checking: true, needsOnboarding: false };
}
