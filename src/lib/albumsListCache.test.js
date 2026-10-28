import { describe, expect, it, beforeEach } from 'vitest';
import {
  readAlbumsListCache,
  writeAlbumsListCache,
  mapAlbumsListCache,
  removeAlbumFromListCache,
  prependAlbumToListCache,
  clearAlbumsListCache,
} from './albumsListCache';

describe('albumsListCache', () => {
  beforeEach(() => {
    clearAlbumsListCache();
  });

  it('round-trips albums and summaries', () => {
    writeAlbumsListCache('u1', {
      albums: [{ id: 'a' }],
      proofSummaries: { a: { clientCommentCount: 2 } },
    });
    expect(readAlbumsListCache('u1').albums).toEqual([{ id: 'a' }]);
    expect(readAlbumsListCache('u1').proofSummaries.a.clientCommentCount).toBe(2);
  });

  it('keeps summaries when only albums are written', () => {
    writeAlbumsListCache('u1', {
      albums: [{ id: 'a' }],
      proofSummaries: { a: { clientCommentCount: 1 } },
    });
    writeAlbumsListCache('u1', { albums: [{ id: 'a' }, { id: 'b' }] });
    expect(readAlbumsListCache('u1').proofSummaries.a.clientCommentCount).toBe(1);
    expect(readAlbumsListCache('u1').albums).toHaveLength(2);
  });

  it('prepends, maps, and removes albums', () => {
    writeAlbumsListCache('u1', { albums: [{ id: 'a' }], proofSummaries: { a: {} } });
    prependAlbumToListCache('u1', { id: 'b' });
    expect(readAlbumsListCache('u1').albums.map((row) => row.id)).toEqual(['b', 'a']);
    mapAlbumsListCache('u1', (albums) => albums.map((row) => ({ ...row, name: row.id })));
    expect(readAlbumsListCache('u1').albums[0].name).toBe('b');
    removeAlbumFromListCache('u1', 'a');
    expect(readAlbumsListCache('u1').albums.map((row) => row.id)).toEqual(['b']);
    expect(readAlbumsListCache('u1').proofSummaries.a).toBeUndefined();
  });
});
