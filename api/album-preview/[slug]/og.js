import {
  getRequestOrigin,
  loadPublicAlbum,
  resolveAlbumCoverMeta,
} from '../../../server/albumPreview/ogCover.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').trim();
  const origin = getRequestOrigin(req);
  const pageUrl = `${origin}/album-preview/${encodeURIComponent(slug)}`;

  let title = 'Album proof';
  let description = 'Review this album, leave comments, and request photo swaps.';
  let imageUrl = `${origin}/logo.png`;

  if (slug) {
    try {
      const album = await loadPublicAlbum(slug);
      if (album) {
        const meta = resolveAlbumCoverMeta(album);
        title = album.name || meta.title || title;
        description = `${title} is ready to review on PixNxt.`;
        const cacheKey = encodeURIComponent(String(meta.updated));
        imageUrl = `${origin}/api/album-preview/${encodeURIComponent(album.slug || slug)}/cover?v=${cacheKey}`;
      }
    } catch (err) {
      console.error('[album-preview/og]', err);
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);
  const safeUrl = escapeHtml(pageUrl);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="PixNxt" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.status(200).send(html);
}
