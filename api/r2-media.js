/**
 * Proxies R2 public bucket reads through same origin.
 * Query form: /api/r2-media?path=users/...
 * Requires VITE_R2_PUBLIC_URL on Vercel.
 */
import { handleR2MediaProxy } from '../server/r2MediaProxyHandler.js';

export default async function handler(req, res) {
  return handleR2MediaProxy(req, res);
}
