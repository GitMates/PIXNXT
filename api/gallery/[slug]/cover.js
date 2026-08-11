import { loadPublicGallery } from '../../../server/galleryShare/ogCover.js';
import { rasterizeGalleryCoverImage } from '../../../server/galleryShare/rasterizeCover.js';

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
    res.status(400).send('Missing gallery');
    return;
  }

  const loaded = await loadPublicGallery(slug).catch((err) => {
    console.error('[gallery/cover] lookup failed', err);
    return { collection: null, photos: [] };
  });
  const collection = loaded?.collection || {
    name: slug.replace(/-/g, ' '),
    slug,
  };
  const photos = loaded?.photos || [];

  try {
    const jpeg = await rasterizeGalleryCoverImage(collection, photos);
    sendJpeg(res, jpeg);
  } catch (err) {
    console.error('[gallery/cover]', err);
    try {
      const jpeg = await rasterizeGalleryCoverImage(
        { name: collection.name || slug.replace(/-/g, ' '), slug },
        []
      );
      sendJpeg(res, jpeg);
    } catch (fallbackErr) {
      console.error('[gallery/cover] fallback failed', fallbackErr);
      res.status(500).send('Could not build cover');
    }
  }
}
