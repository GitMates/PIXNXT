import { handleAnalyzeRequest } from './analyzeImage.js';

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

/** Vite dev-server middleware for POST /api/rekognition/analyze */
export function rekognitionDevMiddleware() {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0];
    if (url !== '/api/rekognition/analyze') return next();

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const result = await handleAnalyzeRequest(body);
      sendJson(res, 200, { ok: true, result });
    } catch (err) {
      console.error('[rekognition/analyze]', err);
      sendJson(res, 500, {
        ok: false,
        error: err?.message || 'Rekognition analyze failed',
        code: err?.name,
      });
    }
  };
}
