import { describe, expect, it, vi } from 'vitest';

vi.mock('./downloadPhoto', () => ({
  fetchPhotoBlob: vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])])),
}));

import { fetchPhotoBlob } from './downloadPhoto';
import { toSameOriginPathStyleMediaUrl } from './r2MediaProxy';
import {
  canFetchStudioMedia,
  deliveryDownloadRows,
  hrefsForStudioFetch,
  photosForDeliveryDownload,
  photosInDeliverySet,
  startNativePhotoDownloads,
  toSameOriginMediaUrl,
  withNativeDownloadParams,
  zipFilenameForDelivery,
  zipFolderForPhoto,
  zipRootFolderForDelivery,
} from './deliveryDownload.js';

const photos = [
  { id: 'a', filename: 'a.jpg', set_id: null, size_bytes: 10 },
  { id: 'b', filename: 'b.jpg', set_id: 'set-1', size_bytes: 20 },
  { id: 'c', filename: 'c.jpg', set_id: 'set-1', size_bytes: 30 },
  { id: 'd', filename: 'd.jpg', set_id: 'set-2', size_bytes: 40 },
];

const sets = [
  { id: 'set-1', name: 'Ceremony' },
  { id: 'set-2', name: 'Reception' },
];

describe('photosInDeliverySet', () => {
  it('returns unassigned photos for Highlights', () => {
    expect(photosInDeliverySet(photos, { id: 'highlights', isHighlights: true }).map((p) => p.id)).toEqual(['a']);
  });

  it('returns photos that belong to a named set', () => {
    expect(photosInDeliverySet(photos, { id: 'set-1' }).map((p) => p.id)).toEqual(['b', 'c']);
  });
});

describe('deliveryDownloadRows', () => {
  it('lists Highlights and named sets with counts', () => {
    const rows = deliveryDownloadRows({ photos, sets, highlightsName: 'Highlights' });
    expect(rows.map((row) => ({ id: row.id, name: row.name, count: row.count }))).toEqual([
      { id: 'highlights', name: 'Highlights', count: 1 },
      { id: 'set-1', name: 'Ceremony', count: 2 },
      { id: 'set-2', name: 'Reception', count: 1 },
    ]);
  });
});

describe('photosForDeliveryDownload', () => {
  it('returns every photo for the all-delivery export', () => {
    expect(photosForDeliveryDownload({ mode: 'all', photos, sets }).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns one set when downloading a set', () => {
    expect(
      photosForDeliveryDownload({
        mode: 'set',
        photos,
        sets,
        setId: 'set-1',
      }).map((p) => p.id),
    ).toEqual(['b', 'c']);
  });
});

describe('zipFilenameForDelivery', () => {
  it('names the zip after the delivery, and includes the set when given', () => {
    expect(zipFilenameForDelivery('MCA / Pongal', null)).toBe('MCA _ Pongal.zip');
    expect(zipFilenameForDelivery('MCA Pongal 2k26', 'Highlights')).toBe('MCA Pongal 2k26 - Highlights.zip');
  });
});

describe('zipRootFolderForDelivery', () => {
  it('uses the delivery name as the folder inside the zip', () => {
    expect(zipRootFolderForDelivery('MCA Pongal 2k26')).toBe('MCA Pongal 2k26');
    expect(zipRootFolderForDelivery('MCA Pongal 2k26', 'Highlights')).toBe('MCA Pongal 2k26/Highlights');
  });
});

describe('toSameOriginPathStyleMediaUrl', () => {
  it('turns an R2 public URL into a same-origin path-style media URL', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
        href: 'http://localhost:5173/',
      },
    });
    expect(
      toSameOriginPathStyleMediaUrl('https://pub-123.r2.dev/users/itsmejabastin/deliveries/a.jpg'),
    ).toBe('http://localhost:5173/v1/r2/media/users/itsmejabastin/deliveries/a.jpg');
    vi.unstubAllGlobals();
  });
});

describe('hrefsForStudioFetch', () => {
  it('rewrites public R2 URLs and never returns the CORS-hanging host', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
        href: 'http://localhost:5173/',
      },
    });
    const hrefs = hrefsForStudioFetch('https://pub-123.r2.dev/users/itsmejabastin/deliveries/a.jpg');
    expect(hrefs).toContain('http://localhost:5173/v1/r2/media/users/itsmejabastin/deliveries/a.jpg');
    expect(hrefs.some((href) => href.includes('.r2.dev'))).toBe(false);
    expect(canFetchStudioMedia('https://pub-123.r2.dev/users/a.jpg')).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('toSameOriginMediaUrl', () => {
  it('rewrites the API host to the current origin on localhost', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
        href: 'http://localhost:5173/',
      },
    });
    const href = toSameOriginMediaUrl('https://pixnxt-api.pixnxt.workers.dev/v1/r2/media?path=users/a.jpg');
    const parsed = new URL(href);
    expect(parsed.origin).toBe('http://localhost:5173');
    expect(parsed.pathname).toBe('/v1/r2/media');
    expect(parsed.searchParams.get('path')).toBe('users/a.jpg');
    vi.unstubAllGlobals();
  });
});

function mockDirectoryHandle() {
  const written = [];
  const makeDir = (folder) => ({
    getDirectoryHandle: async (name) => makeDir(name),
    getFileHandle: async (filename) => ({
      createWritable: async () => ({
        write: async (blob) => {
          written.push({ folder, filename, size: blob.size });
        },
        close: async () => {},
      }),
    }),
  });
  return { handle: makeDir('root'), written };
}

describe('startNativePhotoDownloads', () => {
  it('writes each file into a folder named after the delivery', async () => {
    fetchPhotoBlob.mockClear();
    const { handle, written } = mockDirectoryHandle();
    const onPicked = vi.fn();
    const onProgress = vi.fn();
    const result = await startNativePhotoDownloads(photos, {
      collectionName: 'MCA Pongal 2k26',
      pickDirectory: async () => handle,
      onPicked,
      onProgress,
    });
    expect(onPicked).toHaveBeenCalledWith('MCA Pongal 2k26', 4);
    expect(onProgress).toHaveBeenCalled();
    expect(onProgress.mock.calls[0][0]).toMatchObject({
      folderName: 'MCA Pongal 2k26',
      total: 4,
      filename: 'a.jpg',
    });
    expect(result).toEqual({
      started: 4,
      saved: 4,
      failed: 0,
      cancelled: false,
      folderName: 'MCA Pongal 2k26',
    });
    expect(fetchPhotoBlob).toHaveBeenCalled();
    expect(written).toHaveLength(4);
    expect(written.every((file) => file.folder === 'MCA Pongal 2k26')).toBe(true);
    expect(written.map((file) => file.filename).sort()).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  });

  it('returns cancelled when the folder picker is dismissed', async () => {
    fetchPhotoBlob.mockClear();
    const abort = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
    const result = await startNativePhotoDownloads(photos, {
      collectionName: 'MCA Pongal 2k26',
      pickDirectory: async () => {
        throw abort;
      },
    });
    expect(result).toEqual({ started: 0, saved: 0, failed: 0, cancelled: true });
    expect(fetchPhotoBlob).not.toHaveBeenCalled();
  });

  it('returns zeros when there are no files', async () => {
    expect(await startNativePhotoDownloads([])).toEqual({
      started: 0,
      saved: 0,
      failed: 0,
      cancelled: false,
    });
  });

  it('streams a same-origin media URL instead of public R2', async () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
        href: 'http://localhost:5173/',
      },
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: {
        get: (name) => (name === 'content-type' ? 'image/jpeg' : name === 'content-length' ? '3' : null),
      },
      body: {
        getReader: () => {
          let sent = false;
          return {
            read: async () => {
              if (sent) return { done: true, value: undefined };
              sent = true;
              return { done: false, value: new Uint8Array([1, 2, 3]) };
            },
          };
        },
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    fetchPhotoBlob.mockClear();
    const { handle, written } = mockDirectoryHandle();
    const onProgress = vi.fn();
    const result = await startNativePhotoDownloads(
      [{ id: 'a', filename: 'a.jpg', web_url: 'https://pub-123.r2.dev/users/a.jpg', size_bytes: 3 }],
      { collectionName: 'MCA Pongal 2k26', pickDirectory: async () => handle, onProgress },
    );
    expect(result.saved).toBe(1);
    expect(written).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:5173/v1/r2/media/users/a.jpg');
    expect(onProgress.mock.calls.some((call) => call[0].bytesReceived === 3)).toBe(true);
    expect(fetchPhotoBlob).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('withNativeDownloadParams', () => {
  it('marks the URL as a browser attachment download', () => {
    const href = withNativeDownloadParams(
      'https://media.example/v1/r2/media?path=users/a.jpg',
      'highlights-001.jpg',
    );
    const parsed = new URL(href);
    expect(parsed.searchParams.get('download')).toBe('1');
    expect(parsed.searchParams.get('filename')).toBe('highlights-001.jpg');
    expect(parsed.searchParams.get('path')).toBe('users/a.jpg');
  });
});

describe('zipFolderForPhoto', () => {
  it('puts unassigned photos in Highlights and named-set photos in that set folder', () => {
    expect(zipFolderForPhoto(photos[0], sets, 'Highlights')).toBe('Highlights');
    expect(zipFolderForPhoto(photos[1], sets, 'Highlights')).toBe('Ceremony');
  });
});
