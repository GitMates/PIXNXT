import { loadPublicAlbum } from '../../../server/albumPreview/ogCover.js';
import { rasterizeAlbumCoverImage } from '../../../server/albumPreview/rasterizeCover.js';

export const maxDuration = 30;

function sendJpeg(res, jpeg) {
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader(
    'Cache-Control',
    'public, max-age=120, s-maxage=300, stale-while-revalidate=86400'
  );
  res.status(200).send(jpeg);
}

export default async function handler(req, res) {
  const slug = decodeURIComponent(String(req.query.slug || '')).trim();
  if (!slug) {
    res.status(400).send('Missing album');
    return;
  }

  const album = (await loadPublicAlbum(slug).catch((err) => {
    console.error('[album-preview/cover] lookup failed', err);
    return null;
  })) || {
    name: slug.replace(/-/g, ' '),
    slug,
    preview_data: { blank_covers: true, cover_color_preset: 'sky' },
  };

  try {
    const jpeg = await rasterizeAlbumCoverImage(album);
    sendJpeg(res, jpeg);
  } catch (err) {
    console.error('[album-preview/cover]', err);
    try {
      const jpeg = await rasterizeAlbumCoverImage({
        name: album.name || slug.replace(/-/g, ' '),
        slug,
        preview_data: {
          blank_covers: true,
          cover_color_preset: album.preview_data?.cover_color_preset || 'sky',
          cover_text: album.preview_data?.cover_text || album.name,
        },
      });
      sendJpeg(res, jpeg);
    } catch (fallbackErr) {
      console.error('[album-preview/cover] fallback failed', fallbackErr);
      res.status(500).send('Could not build cover');
    }
  }
}
