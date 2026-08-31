/**
 * POST /api/google-auth — exchange Google OAuth code for tokens (studio login).
 * Body: { code, redirectUri }
 */
import { exchangeGoogleAuthCode } from '../server/googleAuthExchange.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { code, redirectUri } = body;
    const tokens = await exchangeGoogleAuthCode(code, redirectUri);
    res.status(200).json(tokens);
  } catch (err) {
    console.error('[google-auth]', err);
    res.status(400).json({ error: err?.message || 'Google sign-in failed' });
  }
}
