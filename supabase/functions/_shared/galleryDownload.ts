const DEFAULT_R2_BASE = 'https://pub-de49e8c7da824ad9af0c9289299d8467.r2.dev';

if (!Deno.writeAll) {
  // @ts-ignore — required for SMTP client on Supabase Edge
  Deno.writeAll = async (w: Deno.Writer, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveMediaUrl(url: string, r2Base: string): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = r2Base.endsWith('/') ? r2Base : `${r2Base}/`;
  return `${base}${trimmed.replace(/^\//, '')}`;
}

export function pickPhotoDownloadUrl(
  photo: Record<string, unknown>,
  resolution: string,
  r2Base: string
): string {
  const web = resolveMediaUrl(String(photo.web_url || ''), r2Base);
  const full = resolveMediaUrl(String(photo.full_url || photo.thumbnail_url || ''), r2Base);
  if (resolution === 'web') return web || full;
  if (resolution === 'original') return full || web;
  return full || web;
}

export function sanitizeFilename(name: string): string {
  const cleaned = String(name || 'photo.jpg').replace(/[^\w.\-() ]+/g, '_').trim();
  return cleaned.slice(0, 180) || 'photo.jpg';
}

export function formatByteSize(bytes: number): string {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 B';
  const gb = n / 1024 ** 3;
  if (gb >= 0.95) return `${gb.toFixed(1)} GB`;
  const mb = n / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = n / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function resolveSiteOrigin(siteOrigin: string | null | undefined): string {
  const fromSecret = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('VITE_PUBLIC_SITE_URL') || '').replace(
    /\/$/,
    ''
  );
  const fromClient = String(siteOrigin || '').replace(/\/$/, '');
  if (fromClient && /localhost|127\.0\.0\.1|\.local$/i.test(fromClient)) return fromClient;
  if (fromSecret) return fromSecret;
  return fromClient || fromSecret || '';
}

export function buildDownloadReadyPageUrl(origin: string, token: string): string {
  return `${origin}/download/${encodeURIComponent(token)}`;
}

export function buildDownloadEmailHtml(options: {
  brandName: string;
  collectionName: string;
  downloadUrl: string;
  expiryDays: number;
  galleryUrl: string;
}): string {
  const { brandName, collectionName, downloadUrl, expiryDays, galleryUrl } = options;
  const brand = escapeHtml((brandName || 'PIXNXT').toUpperCase());
  const eventName = escapeHtml(collectionName || 'your gallery');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#eceae6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background-color:#ffffff;padding:40px 32px 32px;">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#888;font-family:Arial,Helvetica,sans-serif;">${brand}</p>
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:400;color:#333;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">Download Ready</h1>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#555;font-family:Arial,Helvetica,sans-serif;">
                Your photos for ${eventName} are ready for download. Click the button below to download:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="background-color:#3a3a3a;">
                    <a href="${escapeHtml(downloadUrl)}" style="display:block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">Download Photos</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 28px;font-size:13px;line-height:1.65;color:#777;font-family:Arial,Helvetica,sans-serif;">
                You can use this link to download them again at anytime during the next ${expiryDays} days. After ${expiryDays} days, you can visit the gallery to request a new download.
              </p>
              <p style="margin:0 0 6px;font-size:12px;color:#aaa;font-family:Georgia,'Times New Roman',serif;">${escapeHtml((brandName || 'pixnxt').toLowerCase())}</p>
              <p style="margin:0 0 16px;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
                <a href="${escapeHtml(galleryUrl)}" style="color:#888;text-decoration:none;">${escapeHtml(galleryUrl)}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#aaa;font-family:Arial,Helvetica,sans-serif;">Questions? Reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendDownloadReadyEmail(options: {
  to: string;
  subject: string;
  html: string;
  fromName: string;
}): Promise<void> {
  const host = Deno.env.get('SMTP_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') || 587);
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const fromEmail = Deno.env.get('SMTP_FROM') || user;
  if (!host || !user || !pass || !fromEmail) {
    console.warn('SMTP not configured — skipping download ready email');
    return;
  }

  const { SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts');
  const client = new SmtpClient();
  await client.connectTLS({ hostname: host, port, username: user, password: pass });
  const safeName = String(options.fromName || 'Photographer').replace(/[\r\n"<>]/g, '').trim().slice(0, 80);
  await client.send({
    from: `${safeName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    content: 'Your photos are ready to download.',
    html: options.html,
  });
  await client.close();
}

export function getR2Base(): string {
  return (Deno.env.get('R2_PUBLIC_URL') || DEFAULT_R2_BASE).replace(/\/+$/, '');
}

function getR2Config() {
  const accountId = Deno.env.get('R2_ACCOUNT_ID') || '';
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID') || '';
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY') || '';
  const bucket = Deno.env.get('R2_BUCKET_NAME') || '';
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** Upload zip to R2 when credentials exist; otherwise caller uses Supabase storage. */
export async function uploadGalleryDownloadZipToR2(
  bytes: Uint8Array,
  storageKey: string
): Promise<string> {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  const { S3Client, PutObjectCommand } = await import('https://esm.sh/@aws-sdk/client-s3@3.600.0');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: bytes,
      ContentType: 'application/zip',
    })
  );

  return `r2:${storageKey}`;
}

/** Fetch a stored gallery download zip (Supabase or R2). */
export async function fetchGalleryDownloadZip(
  storagePath: string,
  supabaseAdmin: { storage: { from: (bucket: string) => { createSignedUrl: (path: string, ttl: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }> } } }
): Promise<ArrayBuffer> {
  if (storagePath.startsWith('r2:')) {
    const key = storagePath.slice(3);
    const config = getR2Config();
    if (config) {
      const { S3Client, GetObjectCommand } = await import('https://esm.sh/@aws-sdk/client-s3@3.600.0');
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
      const result = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key })
      );
      if (!result.Body) throw new Error('File not found');
      const chunks: Uint8Array[] = [];
      // @ts-ignore readable stream from AWS SDK
      for await (const chunk of result.Body) {
        chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      return merged.buffer;
    }

    const r2Base = getR2Base();
    const url = `${r2Base}/${key.replace(/^\//, '')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('File not found');
    return response.arrayBuffer();
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('gallery-downloads')
    .createSignedUrl(storagePath, 60 * 15);

  if (signError || !signed?.signedUrl) {
    throw signError || new Error('Could not create download URL');
  }

  const fileResponse = await fetch(signed.signedUrl);
  if (!fileResponse.ok) throw new Error('File not found');
  return fileResponse.arrayBuffer();
}
