import fs from 'node:fs';
import path from 'node:path';
import {
  albumCoverImageUrl,
  getRequestOrigin,
  loadPublicAlbum,
  resolveAlbumCoverMeta,
} from '../../../server/albumPreview/ogCover.js';

const SHARE_CRAWLER_UA =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|embedly|redditbot|applebot|googlebot|bingbot|preview|iframely|vkshare|outbrain/i;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isShareCrawler(req) {
  return SHARE_CRAWLER_UA.test(String(req.headers['user-agent'] || ''));
}

function shareCoverHtml({ title, description, imageUrl, pageUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);
  const safeUrl = escapeHtml(pageUrl);
  // Crawlers only — never include logo.png. WhatsApp uses og:image, then favicon.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeUrl}" />
  <link rel="icon" type="image/jpeg" href="${safeImage}" />
  <link rel="apple-touch-icon" href="${safeImage}" />
  <link rel="image_src" href="${safeImage}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="PixNxt" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:url" content="${safeImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="1200" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
</head>
<body>
  <p><a href="${safeUrl}?app=1">Open album</a></p>
</body>
</html>`;
}

function setMeta(html, attr, key, content) {
  const safe = escapeHtml(content);
  const re = new RegExp(`<meta\\s[^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${safe}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function injectShareMeta(html, { title, description, imageUrl, pageUrl }) {
  let next = html;
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  next = next.replace(
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`
  );
  next = setMeta(next, 'name', 'description', description);
  next = setMeta(next, 'property', 'og:title', title);
  next = setMeta(next, 'property', 'og:description', description);
  next = setMeta(next, 'property', 'og:url', pageUrl);
  next = setMeta(next, 'property', 'og:image', imageUrl);
  next = setMeta(next, 'property', 'og:image:secure_url', imageUrl);
  next = setMeta(next, 'property', 'og:image:url', imageUrl);
  next = setMeta(next, 'property', 'og:image:type', 'image/jpeg');
  next = setMeta(next, 'property', 'og:image:width', '1200');
  next = setMeta(next, 'property', 'og:image:height', '1200');
  next = setMeta(next, 'name', 'twitter:card', 'summary');
  next = setMeta(next, 'name', 'twitter:title', title);
  next = setMeta(next, 'name', 'twitter:description', description);
  next = setMeta(next, 'name', 'twitter:image', imageUrl);
  next = next.replace(/https:\/\/www\.pixnxt\.in\/logo\.png/gi, imageUrl);
  next = next.replace(/\/logo\.png/gi, imageUrl);
  return next;
}

function readLocalIndexHtml() {
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch {
      /* continue */
    }
  }
  return null;
}

let cachedSpaHtml = null;
let cachedSpaAt = 0;

async function loadSpaHtml(origin) {
  const now = Date.now();
  if (cachedSpaHtml && now - cachedSpaAt < 60_000) return cachedSpaHtml;
  const local = readLocalIndexHtml();
  if (local && local.includes('<div id="root"')) {
    cachedSpaHtml = local;
    cachedSpaAt = now;
    return local;
  }
  try {
    const res = await fetch(`${origin}/index.html`, { headers: { Accept: 'text/html' } });
    if (res.ok) {
      const html = await res.text();
      if (html.includes('<div id="root"')) {
        cachedSpaHtml = html;
        cachedSpaAt = now;
        return html;
      }
    }
  } catch (err) {
    console.error('[album-preview/og] index fetch failed', err?.message || err);
  }
  return local;
}

async function resolveSharePayload(req) {
  const slug = decodeURIComponent(String(req.query.slug || '')).trim();
  const origin = getRequestOrigin(req);
  const pageUrl = `${origin}/album-preview/${encodeURIComponent(slug)}`;
  let title = 'Album proof';
  let description = 'Review this album, leave comments, and request photo swaps.';
  let imageUrl = albumCoverImageUrl(origin, slug, Date.now());

  if (slug) {
    try {
      const album = await loadPublicAlbum(slug);
      if (album) {
        const meta = resolveAlbumCoverMeta(album);
        title = album.name || meta.title || title;
        description = `${title} is ready to review on PixNxt.`;
        imageUrl = albumCoverImageUrl(origin, album.slug || slug, meta.updated);
      }
    } catch (err) {
      console.error('[album-preview/og]', err);
    }
  }

  return { title, description, imageUrl, pageUrl, slug };
}

/** Send browsers into the React app; keep this OG HTML for crawlers only. */
function redirectHumansToSpa(req, res, pageUrl) {
  const dest = new URL(pageUrl);
  const query = req.query || {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'slug') continue;
    if (value == null) continue;
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw == null || raw === '') continue;
    dest.searchParams.set(key, String(raw));
  }
  dest.searchParams.set('app', '1');
  const location = `${dest.pathname}?${dest.searchParams.toString()}`;
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'private, no-store',
  });
  res.end();
}

export default async function handler(req, res) {
  const share = await resolveSharePayload(req);

  // People must get the SPA (Your Details / album UI). The bare "Open album"
  // document is for crawlers only — if SPA inject fails, redirect to ?app=1.
  if (!isShareCrawler(req)) {
    try {
      const spa = await loadSpaHtml(getRequestOrigin(req));
      if (spa) {
        const html = injectShareMeta(spa, share);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        res.status(200).send(html);
        return;
      }
    } catch (err) {
      console.error('[album-preview/og] spa inject failed', err);
    }
    redirectHumansToSpa(req, res, share.pageUrl);
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.status(200).send(shareCoverHtml(share));
}
