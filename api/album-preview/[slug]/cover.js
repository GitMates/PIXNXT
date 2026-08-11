import {
  loadPublicAlbum,
  rasterizeCoverImage,
} from '../../../server/albumPreview/ogCover.js';

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').trim();
  if (!slug) {
    res.status(400).send('Missing album');
    return;
  }

  try {
    const album = await loadPublicAlbum(slug);
    if (!album) {
      res.status(404).send('Album not found');
      return;
    }

    const jpeg = await rasterizeCoverImage(album);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(jpeg);
  } catch (err) {
    console.error('[album-preview/cover]', err);
    res.status(500).send('Could not build cover');
  }
}
