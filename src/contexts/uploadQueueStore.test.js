import { describe, expect, test, vi } from 'vitest';
import {
  createUploadQueueStore,
  pendingTilesEqual,
  selectPendingUploadTiles,
  shallowEqualArrays,
} from './uploadQueueStore';

const base = { isOpen: false, isMinimized: false, isPaused: false, showDetails: false, activeTab: 'uploading', files: [] };
const f = (id, status, extra = {}) => ({ id, name: `${id}.jpg`, size: 1, progress: 0, status, collectionId: 'c1', setId: null, ...extra });

describe('createUploadQueueStore', () => {
  test('setState with updater notifies subscribers; identical state does not', () => {
    const store = createUploadQueueStore(base);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((prev) => ({ ...prev, isOpen: true }));
    store.setState((prev) => prev);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().isOpen).toBe(true);
  });

  test('unsubscribe stops notifications', () => {
    const store = createUploadQueueStore(base);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.setState({ ...base, isOpen: true });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('shallowEqualArrays', () => {
  test('compares by reference per element', () => {
    const a = {}; const b = {};
    expect(shallowEqualArrays([a, b], [a, b])).toBe(true);
    expect(shallowEqualArrays([a, b], [a, {}])).toBe(false);
    expect(shallowEqualArrays([a], [a, b])).toBe(false);
  });
});

describe('selectPendingUploadTiles', () => {
  test('keeps only pending files for the collection and drops progress', () => {
    const state = { ...base, files: [f('a', 'uploading', { progress: 40 }), f('b', 'completed'), f('c', 'error'), f('d', 'waiting', { collectionId: 'other' })] };
    const tiles = selectPendingUploadTiles(state, 'c1');
    expect(tiles.map((t) => t.id)).toEqual(['a']);
    expect(tiles[0]).not.toHaveProperty('progress');
  });

  test('progress is quantized when progressStep is given', () => {
    const state = { ...base, files: [f('a', 'uploading', { progress: 43 })] };
    expect(selectPendingUploadTiles(state, 'c1', { progressStep: 5 })[0].progress).toBe(40);
  });
});

describe('pendingTilesEqual', () => {
  test('equal when id/status/previewUrl/setId/progress match, regardless of object identity', () => {
    const a = [{ id: 'a', status: 'uploading', previewUrl: undefined, setId: null, progress: undefined }];
    const b = [{ id: 'a', status: 'uploading', previewUrl: undefined, setId: null, progress: undefined }];
    expect(pendingTilesEqual(a, b)).toBe(true);
    expect(pendingTilesEqual(a, [{ ...b[0], status: 'processing' }])).toBe(false);
    expect(pendingTilesEqual(a, [])).toBe(false);
  });
});
