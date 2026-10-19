import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCollectionPendingDelete,
  clearGalleryBoard,
  filterPendingDeletedCollections,
  markCollectionDeleteSettled,
  markCollectionPendingDelete,
  mergeFetchedBoardCollections,
  readGalleryBoard,
  rememberCreatedCollection,
  removeCollectionFromBoard,
  removeCollectionFromBoardData,
  upsertCollectionOnBoard,
  upsertCollectionOnBoardData,
  writeGalleryBoard,
} from './galleryBoardCache';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('galleryBoardCache', () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it('removeCollectionFromBoardData drops the delivery and keeps folders', () => {
    const next = removeCollectionFromBoardData(
      {
        collections: [{ id: 'a' }, { id: 'b' }],
        folders: [{ id: 'f1' }],
      },
      'a',
    );
    expect(next.collections).toEqual([{ id: 'b' }]);
    expect(next.folders).toEqual([{ id: 'f1' }]);
  });

  it('upsertCollectionOnBoardData prepends a new delivery', () => {
    const next = upsertCollectionOnBoardData(
      { collections: [{ id: 'a', name: 'Old' }], folders: [] },
      { id: 'b', name: 'New' },
    );
    expect(next.collections.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('upsertCollectionOnBoardData merges an existing delivery', () => {
    const next = upsertCollectionOnBoardData(
      { collections: [{ id: 'a', name: 'Old', status: 'draft' }], folders: [] },
      { id: 'a', name: 'Renamed' },
    );
    expect(next.collections).toEqual([{ id: 'a', name: 'Renamed', status: 'draft' }]);
  });

  it('persists remove and upsert through session storage', () => {
    writeGalleryBoard(
      'user-1',
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      [{ id: 'f1' }],
      storage,
    );

    removeCollectionFromBoard('user-1', 'a', storage);
    expect(readGalleryBoard('user-1', storage).collections).toEqual([{ id: 'b', name: 'B' }]);

    upsertCollectionOnBoard('user-1', { id: 'c', name: 'C' }, storage);
    expect(readGalleryBoard('user-1', storage).collections.map((c) => c.id)).toEqual([
      'c',
      'b',
    ]);

    clearGalleryBoard('user-1', storage);
    expect(readGalleryBoard('user-1', storage)).toBeNull();
  });

  it('filters pending deletes so a racing refetch cannot restore ghosts', () => {
    markCollectionPendingDelete('user-1', 'ghost', storage);
    const filtered = filterPendingDeletedCollections(
      'user-1',
      [{ id: 'ghost' }, { id: 'keep' }],
      storage,
    );
    expect(filtered.map((c) => c.id)).toEqual(['keep']);

    clearCollectionPendingDelete('user-1', 'ghost', storage);
    expect(
      filterPendingDeletedCollections(
        'user-1',
        [{ id: 'ghost' }, { id: 'keep' }],
        storage,
      ).map((c) => c.id),
    ).toEqual(['ghost', 'keep']);
  });

  it('keeps optimistic creates when a refetch omits them', () => {
    rememberCreatedCollection(
      'user-1',
      { id: 'demo-1', name: 'Demo 1', status: 'draft' },
      storage,
    );
    writeGalleryBoard(
      'user-1',
      [
        { id: 'demo-1', name: 'Demo 1', status: 'draft' },
        { id: 'mca', name: 'MCA', status: 'published' },
      ],
      [],
      storage,
    );

    const merged = mergeFetchedBoardCollections(
      'user-1',
      [{ id: 'mca', name: 'MCA', status: 'published' }],
      storage,
    );
    expect(merged.map((c) => c.id)).toEqual(['demo-1', 'mca']);
  });

  it('prefers API rows once a pending create appears in the refetch', () => {
    rememberCreatedCollection(
      'user-1',
      { id: 'demo-1', name: 'Demo 1 (local)', status: 'draft' },
      storage,
    );

    const merged = mergeFetchedBoardCollections(
      'user-1',
      [{ id: 'demo-1', name: 'Demo 1', status: 'draft', photo_count: 0 }],
      storage,
    );
    expect(merged).toEqual([
      { id: 'demo-1', name: 'Demo 1', status: 'draft', photo_count: 0 },
    ]);
  });

  it('does not resurrect a delivery that was created then deleted', () => {
    rememberCreatedCollection(
      'user-1',
      { id: 'demo-2', name: 'Demo 2', status: 'draft' },
      storage,
    );
    removeCollectionFromBoard('user-1', 'demo-2', storage);

    const merged = mergeFetchedBoardCollections(
      'user-1',
      [
        { id: 'demo-2', name: 'Demo 2', status: 'draft' },
        { id: 'mca', name: 'MCA', status: 'published' },
      ],
      storage,
    );
    expect(merged.map((c) => c.id)).toEqual(['mca']);
  });

  it('keeps hiding after DELETE settles even when a stale list still includes the row', () => {
    removeCollectionFromBoard('user-1', 'demo-2', storage);
    markCollectionDeleteSettled('user-1', 'demo-2', storage);

    const stale = mergeFetchedBoardCollections(
      'user-1',
      [
        { id: 'demo-2', name: 'Demo 2' },
        { id: 'mca', name: 'MCA' },
      ],
      storage,
    );
    expect(stale.map((c) => c.id)).toEqual(['mca']);

    // Fresh list without the row finally drops the tombstone.
    const fresh = mergeFetchedBoardCollections(
      'user-1',
      [{ id: 'mca', name: 'MCA' }],
      storage,
    );
    expect(fresh.map((c) => c.id)).toEqual(['mca']);
    expect(
      filterPendingDeletedCollections(
        'user-1',
        [{ id: 'demo-2' }, { id: 'mca' }],
        storage,
      ).map((c) => c.id),
    ).toEqual(['demo-2', 'mca']);
  });

  it('does not drop an in-flight delete tombstone just because a list omits the id', () => {
    removeCollectionFromBoard('user-1', 'demo-2', storage);

    mergeFetchedBoardCollections('user-1', [{ id: 'mca', name: 'MCA' }], storage);

    // Still in-flight — a later stale list with demo-2 must not win.
    const stale = mergeFetchedBoardCollections(
      'user-1',
      [
        { id: 'demo-2', name: 'Demo 2' },
        { id: 'mca', name: 'MCA' },
      ],
      storage,
    );
    expect(stale.map((c) => c.id)).toEqual(['mca']);
  });
});
