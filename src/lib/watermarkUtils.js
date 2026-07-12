import { getProxiedMediaFetchUrl } from './r2MediaProxy';

/**
 * Applies a watermark to an image blob using a canvas.
 * @param {Blob} blob - The original image blob
 * @param {Object} options - Watermark options (type, text, font, color, scale, opacity, position)
 * @returns {Promise<Blob>} The watermarked image blob
 */
export async function applyWatermarkToBlob(blob, options) {
  if (!options) return blob;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      URL.revokeObjectURL(blobUrl);
      const canvas = document.createElement('canvas');
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(blob); // fallback
      }
      
      ctx.drawImage(img, 0, 0);

      const scale = options.watermark_scale || 50; // 1-100
      const opacity = options.watermark_opacity ?? 50; // 0-100
      const pos = options.watermark_position || 'center';
      const padding = width * 0.015; // 1.5% padding from edges

      if (options.watermark_type === 'image' && options.watermark_url) {
        try {
          const wmFetchUrl = getProxiedMediaFetchUrl(options.watermark_url);
          const wmResponse = await fetch(wmFetchUrl, { cache: 'no-store' });
          if (!wmResponse.ok) throw new Error(`Failed to fetch watermark: ${wmResponse.status}`);
          const wmBlob = await wmResponse.blob();
          const wmBlobUrl = URL.createObjectURL(wmBlob);

          const wmImg = new Image();
          await new Promise((resolveWM, rejectWM) => {
            wmImg.onload = () => resolveWM(wmImg);
            wmImg.onerror = rejectWM;
            wmImg.src = wmBlobUrl;
          });
          URL.revokeObjectURL(wmBlobUrl);

          const maxWmWidth = width * (scale / 100);
          const maxWmHeight = height * (scale / 100);
          
          let wmWidth = wmImg.naturalWidth;
          let wmHeight = wmImg.naturalHeight;
          const ratio = Math.min(maxWmWidth / wmWidth, maxWmHeight / wmHeight);
          wmWidth *= ratio;
          wmHeight *= ratio;
          
          let x = (width - wmWidth) / 2;
          let y = (height - wmHeight) / 2;
          
          if (pos.includes('top')) y = padding;
          else if (pos.includes('bottom')) y = height - wmHeight - padding;
          
          if (pos.includes('left')) x = padding;
          else if (pos.includes('right')) x = width - wmWidth - padding;
          
          ctx.globalAlpha = opacity / 100;
          ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
        } catch (err) {
          console.warn('Failed to load watermark image', err);
        }
      } else if (options.watermark_type === 'text' && options.watermark_text) {
        const text = options.watermark_text;
        const fontFam = options.watermark_font || 'Inter';
        const color = options.watermark_color || '#ffffff';

        const fontSize = (width * (scale / 100)) * 0.15;
        
        ctx.font = `600 ${fontSize}px "${fontFam}", sans-serif`;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity / 100;
        ctx.textBaseline = 'middle';
        
        let x = width / 2;
        let y = height / 2;
        ctx.textAlign = 'center';

        if (pos.includes('top')) {
          y = padding + (fontSize / 2);
        } else if (pos.includes('bottom')) {
          y = height - padding - (fontSize / 2);
        }

        if (pos.includes('left')) {
          x = padding;
          ctx.textAlign = 'left';
        } else if (pos.includes('right')) {
          x = width - padding;
          ctx.textAlign = 'right';
        }

        ctx.fillText(text, x, y);
      }
      
      ctx.globalAlpha = 1.0;

      canvas.toBlob((newBlob) => {
        if (newBlob) {
          resolve(newBlob);
        } else {
          resolve(blob); // fallback
        }
      }, blob.type || 'image/jpeg', 0.95);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(blob); // fallback to original if image fails to load
    };

    img.src = blobUrl;
  });
}
