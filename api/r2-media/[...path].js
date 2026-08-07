/**
 * Path-style proxy: /api/r2-media/users/...
 * Prefer /api/r2-media?path=users/... when possible.
 */
import { handleR2MediaProxy } from '../../server/r2MediaProxyHandler.js';

export default async function handler(req, res) {
  return handleR2MediaProxy(req, res);
}
