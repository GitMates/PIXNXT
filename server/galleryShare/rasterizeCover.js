import sharp from 'sharp';
import { buildLeatherCoverSvg, OG_WIDTH, OG_HEIGHT } from '../albumPreview/ogCover.js';
import { galleryCoverCandidateUrls, resolveGalleryShareMeta } from './ogCover.js';

const CHARCOAL = { base: '#3a3a3a', highlight: '#525252', shadow: '#222222', text: '#f4f0ea' };

async function toSquareJpeg(input) {
  return sharp(input)
    .rotate()
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84 })
    .toBuffer();
}

async function fetchImageBuffer(url) {
  if (url.startsWith('data:image')) {
    return Buffer.from((url.split(',')[1] || ''), 'base64');
  }
  const upstream = await fetch(url, { headers: { Accept: 'image/*' } });
  if (!upstream.ok) throw new Error(`gallery cover fetch ${upstream.status}`);
  return Buffer.from(await upstream.arrayBuffer());
}

export async function rasterizeGalleryCoverImage(collection, photos = []) {
  const { title } = resolveGalleryShareMeta(collection, photos);
  const candidates = galleryCoverCandidateUrls(collection, photos);

  for (const url of candidates) {
    try {
      const input = await fetchImageBuffer(url);
      return await toSquareJpeg(input);
    } catch (err) {
      console.error('[gallery-cover] photo failed', url, err?.message || err);
    }
  }

  const svg = buildLeatherCoverSvg(title, CHARCOAL);
  return sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
}
