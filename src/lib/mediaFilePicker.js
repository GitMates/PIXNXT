// Media upload filters for the native file dialog.
// "All Files" is first in the list so Windows/Chrome default to it (not Images).
// Each filter uses a single MIME key so Windows shows the description, not "Custom Files".

import { RAW_IMAGE_EXTENSIONS, RAW_IMAGE_ACCEPT_STRING } from './rawImageFormats';

/** Fallback file input: omit accept so the OS dialog defaults to All Files. */
export const MEDIA_FILE_INPUT_ACCEPT = undefined;

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.bmp',
  '.tif',
  '.tiff',
];

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.wmv'];

const ALL_MEDIA_EXTENSIONS = [
  ...new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, '.gif', ...RAW_IMAGE_EXTENSIONS]),
];

/** Cover slot — images and RAW only (no video). */
export const COVER_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,.gif,' +
  RAW_IMAGE_ACCEPT_STRING;

export const MEDIA_FILE_PICKER_TYPES = [
  {
    description: 'All Files',
    accept: {
      'image/*': ALL_MEDIA_EXTENSIONS,
    },
  },
  {
    description: 'Images',
    accept: {
      'image/*': IMAGE_EXTENSIONS,
    },
  },
  {
    description: 'Videos',
    accept: {
      'video/*': VIDEO_EXTENSIONS,
    },
  },
  {
    description: 'GIF',
    accept: {
      'image/gif': ['.gif'],
    },
  },
  {
    description: 'Raw files',
    accept: {
      'application/octet-stream': RAW_IMAGE_EXTENSIONS,
    },
  },
];

/**
 * Open OS file picker: All Files (default), then Images / Videos / GIF / Raw files.
 * @param {{ multiple?: boolean }} [options]
 * @returns {Promise<File[]|null>} Selected files, null if cancelled or API unavailable
 */
export async function pickMediaFiles({ multiple = true } = {}) {
  if (typeof window === 'undefined' || typeof window.showOpenFilePicker !== 'function') {
    return null;
  }

  try {
    const handles = await window.showOpenFilePicker({
      multiple,
      excludeAcceptAllOption: true,
      types: MEDIA_FILE_PICKER_TYPES,
    });
    return Promise.all(handles.map((handle) => handle.getFile()));
  } catch (err) {
    if (err?.name === 'AbortError') return null;
    throw err;
  }
}

/**
 * Try native picker with typed filters; run fallback (e.g. input.click()) if unavailable.
 * @param {{ multiple?: boolean, fallback: () => void }} options
 * @returns {Promise<File[]|undefined>}
 */
export async function pickMediaFilesOrFallback({ multiple = true, fallback }) {
  try {
    const files = await pickMediaFiles({ multiple });
    if (files?.length) return files;
  } catch (err) {
    console.warn('Media file picker failed, using fallback input:', err);
  }
  fallback();
  return undefined;
}
