import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Minimal external store for the upload queue. Progress ticks call setState
 * hundreds of times per second during a large batch; keeping the state out
 * of React Context means only components that select a changed slice re-render.
 */
export function createUploadQueueStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState(updater) {
      const next = typeof updater === 'function' ? updater(state) : updater;
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Subscribe to a derived slice. `selector` and `isEqual` must be referentially
 * stable (module-level functions or useCallback) or the snapshot cache resets
 * each render. The last selected value is returned while isEqual says it is
 * unchanged, which is what stops the re-render.
 */
export function useStoreSelector(store, selector, isEqual = Object.is) {
  const cacheRef = useRef({ hasValue: false, value: undefined });
  const getSnapshot = useCallback(() => {
    const next = selector(store.getState());
    const cache = cacheRef.current;
    if (cache.hasValue && isEqual(cache.value, next)) return cache.value;
    cacheRef.current = { hasValue: true, value: next };
    return next;
  }, [store, selector, isEqual]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function shallowEqualArrays(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

const PENDING_STATUSES = new Set(['waiting', 'uploading', 'processing']);

export function isPendingUploadFile(f) {
  return PENDING_STATUSES.has(f.status);
}

/**
 * Grid placeholders only need identity, status, preview and destination.
 * Progress is dropped (or quantized) so the dashboard does not re-render on
 * every XHR progress event.
 */
export function selectPendingUploadTiles(state, collectionId, { progressStep } = {}) {
  const out = [];
  for (const f of state.files) {
    if (!isPendingUploadFile(f)) continue;
    if (f.collectionId && collectionId && f.collectionId !== collectionId) continue;
    const tile = {
      id: f.id,
      name: f.name,
      status: f.status,
      previewUrl: f.previewUrl,
      setId: f.setId ?? null,
      collectionId: f.collectionId,
      mediaKind: f.mediaKind,
      file: f.file,
    };
    if (progressStep) {
      tile.progress = Math.floor((f.progress || 0) / progressStep) * progressStep;
    }
    out.push(tile);
  }
  return out;
}

export function pendingTilesEqual(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.status !== y.status ||
      x.previewUrl !== y.previewUrl ||
      x.setId !== y.setId ||
      x.progress !== y.progress
    ) {
      return false;
    }
  }
  return true;
}

export function selectHasPendingUploads(state) {
  return state.files.some(isPendingUploadFile);
}
