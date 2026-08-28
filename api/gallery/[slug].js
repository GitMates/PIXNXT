import coverHandler from '../../server/galleryShare/coverHandler.js';
import ogHandler from '../../server/galleryShare/ogHandler.js';

export const maxDuration = 30;

export default async function handler(req, res) {
  const action = String(req.query?.action || 'og').toLowerCase();
  if (action === 'cover') {
    return coverHandler(req, res);
  }
  return ogHandler(req, res);
}
