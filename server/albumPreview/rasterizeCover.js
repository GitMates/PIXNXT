import sharp from 'sharp';
import {
  OG_WIDTH,
  OG_HEIGHT,
  buildLeatherCoverSvg,
  resolveAlbumCoverMeta,
  resolveAlbumCoverPhotoUrl,
  normalizePreviewData,
} from './ogCover.js';

async function toSquareJpeg(input, { frontPanel = false } = {}) {
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  const width = meta.width || OG_WIDTH;
  const height = meta.height || OG_HEIGHT;
  const panoramic = width / Math.max(1, height) >= 1.5;
  let pipeline = image;
  if (frontPanel && panoramic) {
    const left = Math.round(width * 0.55);
    pipeline = image.extract({
      left,
      top: 0,
      width: Math.max(1, width - left),
      height,
    });
  }
  return pipeline
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84 })
    .toBuffer();
}

export async function rasterizeAlbumCoverImage(album) {
  const photoUrl = resolveAlbumCoverPhotoUrl(album);
  const { title, preset } = resolveAlbumCoverMeta(album);
  const preview = normalizePreviewData(album?.preview_data);
  const blankCovers = album?.blank_covers === true || preview.blank_covers === true;

  if (photoUrl) {
    try {
      let input;
      if (photoUrl.startsWith('data:image')) {
        const base64 = photoUrl.split(',')[1] || '';
        input = Buffer.from(base64, 'base64');
      } else {
        const upstream = await fetch(photoUrl, { headers: { Accept: 'image/*' } });
        if (!upstream.ok) throw new Error(`cover fetch ${upstream.status}`);
        input = Buffer.from(await upstream.arrayBuffer());
      }
      return await toSquareJpeg(input, { frontPanel: true });
    } catch (err) {
      console.error('[album-preview-cover] photo failed, using leather', err?.message || err);
      if (!blankCovers) {
        // Photo album with a broken URL should still try leather rather than 500.
      }
    }
  }

  try {
    const svg = buildLeatherCoverSvg(title, preset);
    return await sharp(Buffer.from(svg), { density: 150 }).jpeg({ quality: 86 }).toBuffer();
  } catch (err) {
    console.error('[album-preview-cover] leather svg failed, using solid fill', err?.message || err);
    const svg = buildLeatherCoverSvg(title, preset);
    try {
      return await sharp(Buffer.from(svg), { density: 150 }).jpeg({ quality: 86 }).toBuffer();
    } catch {
      return sharp({
        create: {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          channels: 3,
          background: preset.base,
        },
      })
        .jpeg({ quality: 80 })
        .toBuffer();
    }
  }
}
