/**
 * Lightweight HTML5 <video> probe to extract duration and dimensions.
 * Never throws — resolves fallback values if browser decoders fail (e.g. ProRes on Windows).
 *
 * @param {File|Blob} file
 * @param {number} [timeoutMs=4000]
 * @returns {Promise<{ duration: number|null, width: number|null, height: number|null, probeOk: boolean }>}
 */
export function probeVideoMetadata(file, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!file || !String(file.type || '').startsWith('video/')) {
      resolve({ duration: null, width: null, height: null, probeOk: false });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({ duration: null, width: null, height: null, probeOk: false });
    }, timeoutMs);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const rawDur = video.duration;
      const duration = Number.isFinite(rawDur) && rawDur > 0 ? Math.round(rawDur * 100) / 100 : null;
      const width = video.videoWidth || null;
      const height = video.videoHeight || null;
      cleanup();
      resolve({ duration, width, height, probeOk: true });
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      // Browser decoder unsupported (e.g., ProRes or missing codec). Do NOT fail upload.
      resolve({ duration: null, width: null, height: null, probeOk: false });
    };

    video.src = objectUrl;
  });
}
