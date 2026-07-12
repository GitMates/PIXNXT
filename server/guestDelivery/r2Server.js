import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function getR2Config() {
  const accountId = process.env.VITE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  const publicUrl = (process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let cachedClient = null;

function getR2Client() {
  if (cachedClient) return cachedClient;
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 storage is not configured.');
  }
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return cachedClient;
}

export async function uploadBytesToR2(path, bytes, contentType = 'image/jpeg') {
  const { bucket, publicUrl } = getR2Config();
  if (!bucket || !publicUrl) {
    throw new Error('R2 bucket or public URL is not configured.');
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: bytes,
      ContentType: contentType,
    })
  );

  return {
    path,
    url: `${publicUrl}/${path}`,
  };
}

export function decodeBase64Image(dataUrlOrBase64) {
  const raw = String(dataUrlOrBase64 || '').trim();
  if (!raw) throw new Error('Selfie image is required.');

  const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('Invalid selfie image.');
  if (buffer.length > 6 * 1024 * 1024) {
    throw new Error('Selfie image is too large.');
  }
  return buffer;
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getBytesFromR2(path) {
  const { bucket } = getR2Config();
  if (!bucket) throw new Error('R2 bucket is not configured.');

  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    })
  );

  const buffer = await streamToBuffer(response.Body);
  if (!buffer.length) throw new Error('Selfie file is empty.');
  return buffer;
}
