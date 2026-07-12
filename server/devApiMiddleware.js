import { handleAnalyzeRequest } from './rekognition/analyzeImage.js';
import {
  handleIndexPhotoRequest,
  handleIndexCollectionRequest,
  handleSyncCollectionRequest,
  handleReclusterRequest,
  handleGetPeopleRequest,
  handleSearchSelfieRequest,
  handlePublicSearchSelfieRequest,
} from './photoAi/handlers.js';
import { handleRegisterGuestRequest } from './guestDelivery/registerGuest.js';
import { handlePublishEventRequest } from './guestDelivery/publishEvent.js';
import { handleGuestGalleryRequest } from './guestDelivery/getGuestGallery.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

const ROUTES = {
  '/api/rekognition/analyze': (req, body) => handleAnalyzeRequest(body),
  '/api/photo-ai/index': (req, body) => handleIndexPhotoRequest(req, body),
  '/api/photo-ai/index-collection': (req, body) => handleIndexCollectionRequest(req, body),
  '/api/photo-ai/sync-collection': (req, body) => handleSyncCollectionRequest(req, body),
  '/api/photo-ai/recluster': (req, body) => handleReclusterRequest(req, body),
  '/api/photo-ai/people': (req, body) => handleGetPeopleRequest(req, body),
  '/api/photo-ai/search-selfie': (req, body) => handleSearchSelfieRequest(req, body),
  '/api/photo-ai/public/search-selfie': (req, body) => handlePublicSearchSelfieRequest(req, body),
  '/api/guest-delivery/register': (_req, body) => handleRegisterGuestRequest(body),
  '/api/guest-delivery/publish': (req, body) => handlePublishEventRequest(req, body),
  '/api/guest-delivery/gallery': (_req, body) => handleGuestGalleryRequest(body),
};

/** Vite dev-server middleware for local API routes */
export function devApiMiddleware() {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0];
    const handler = ROUTES[url];
    if (!handler) return next();

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const result = await handler(req, body);
      sendJson(res, 200, { ok: true, result });
    } catch (err) {
      console.error(`[${url}]`, err);
      const status = err?.message === 'Unauthorized' || err?.message === 'Forbidden' ? 403 : 500;
      sendJson(res, status, {
        ok: false,
        error: err?.message || 'Request failed',
        code: err?.name,
      });
    }
  };
}
