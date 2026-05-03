import { S3Client } from '@aws-sdk/client-s3';

const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.warn('Missing Cloudflare R2 environment variables. Storage functionality may be limited.');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  forcePathStyle: true,
});

export const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;
