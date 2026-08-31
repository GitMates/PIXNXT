/**
 * Same-origin R2 upload for photographer custom domains (browser PUT blocked by bucket CORS).
 * PUT /api/r2-upload?path=album-proofer/{albumId}/feedback/...
 */
import { handleR2Upload } from '../server/r2UploadHandler.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  return handleR2Upload(req, res);
}
