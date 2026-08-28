/** AWS SearchFacesByImage accepts up to 5 MB of image bytes. */
const REKOGNITION_MAX_BYTES = 5 * 1024 * 1024;

function dataUrlByteLength(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/** Convert any browser image file/data URL to JPEG for AWS Rekognition. */
export function prepareSelfieForRekognition(fileOrDataUrl) {
  return new Promise((resolve, reject) => {
    const load = (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) {
          reject(new Error('Could not read image dimensions.'));
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image.'));
          return;
        }

        const tryEncode = (maxEdge, quality) => {
          let w = width;
          let h = height;
          if (w > maxEdge || h > maxEdge) {
            const scale = maxEdge / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', quality);
        };

        // Prefer a sharp crop; step down size/quality until under Rekognition's 5 MB limit.
        const attempts = [
          [2048, 0.92],
          [1600, 0.85],
          [1280, 0.8],
          [1024, 0.75],
          [800, 0.7],
        ];

        let out = null;
        for (const [maxEdge, quality] of attempts) {
          out = tryEncode(maxEdge, quality);
          if (dataUrlByteLength(out) <= REKOGNITION_MAX_BYTES) {
            resolve(out);
            return;
          }
        }

        resolve(out);
      };
      img.onerror = () => reject(new Error('Could not read image file. Try JPEG or PNG.'));
      img.src = dataUrl;
    };

    if (typeof fileOrDataUrl === 'string') {
      load(fileOrDataUrl);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => load(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(fileOrDataUrl);
  });
}
