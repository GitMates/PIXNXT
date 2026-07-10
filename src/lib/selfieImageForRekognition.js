/** Convert any browser image file/data URL to JPEG for AWS Rekognition. */
export function prepareSelfieForRekognition(fileOrDataUrl) {
  return new Promise((resolve, reject) => {
    const load = (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        const maxEdge = 2048;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) {
          reject(new Error('Could not read image dimensions.'));
          return;
        }
        if (width > maxEdge || height > maxEdge) {
          const scale = maxEdge / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
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
