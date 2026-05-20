/**
 * Media upload filters for the native file dialog.
 * Chrome/Edge (File System Access API): dropdown shows Images, Videos, GIF, Raw files, plus All Files.
 * Fallback <input accept>: combined image/video/gif/raw types.
 */

import { RAW_IMAGE_EXTENSIONS, RAW_IMAGE_ACCEPT_STRING } from './rawImageFormats';

export const MEDIA_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,.gif,' +
  'video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.mkv,.m4v,.avi,' +
  RAW_IMAGE_ACCEPT_STRING;

export const MEDIA_FILE_PICKER_TYPES = [
  {
    description: 'Images',
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tif', '.tiff'],
    },
  },
  {
    description: 'Videos',
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.wmv'],
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
 * Open OS file picker with Image / Video / GIF / Raw files filter groups when supported.
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
