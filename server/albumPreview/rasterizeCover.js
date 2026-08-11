import sharp from 'sharp';
import {
  OG_WIDTH,
  OG_HEIGHT,
  buildLeatherCoverSvg,
  resolveAlbumCoverMeta,
  resolveAlbumCoverPhotoUrl,
} from './ogCover.js';

export async function rasterizeAlbumCoverImage(album) {
  const photoUrl = resolveAlbumCoverPhotoUrl(album);
  const { title, preset } = resolveAlbumCoverMeta(album);

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
      return await sharp(input)
        .rotate()
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 84 })
        .toBuffer();
    } catch (err) {
      console.error('[album-preview-cover] photo failed, using leather', err?.message || err);
    }
  }

  try {
    const svg = buildLeatherCoverSvg(title, preset);
    return await sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
  } catch (err) {
    console.error('[album-preview-cover] leather svg failed, using solid fill', err?.message || err);
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
