/**
 * Public R2 display settings only. Bucket credentials must never be VITE_
 * prefixed — Vite inlines those into the browser bundle.
 * Uploads go through the Workers API (`/v1/r2/direct` presign).
 */
export const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

if (import.meta.env.PROD && !R2_PUBLIC_URL) {
  console.error(
    '[PIXNXT] VITE_R2_PUBLIC_URL is not set. Photos will not load until you add it in your hosting env (Cloudflare Pages → Settings → Environment Variables) and redeploy.'
  );
}
