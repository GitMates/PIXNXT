import coverHandler from '../../server/albumPreview/coverHandler.js';
import ogHandler from '../../server/albumPreview/ogHandler.js';

export const maxDuration = 30;

export default async function handler(req, res) {
  const action = String(req.query?.action || 'og').toLowerCase();
  if (action === 'cover') {
    return coverHandler(req, res);
  }
  return ogHandler(req, res);
}
