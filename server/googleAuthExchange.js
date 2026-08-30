/**
 * Exchange a Google OAuth authorization code for ID / access tokens.
 * Used for studio login so Google shows pixnxt.in (not *.supabase.co) on the consent screen.
 */
export async function exchangeGoogleAuthCode(code, redirectUri) {
  const clientId =
    process.env.VITE_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth is not configured on the server (GOOGLE_CLIENT_SECRET and client ID required).'
    );
  }

  if (!code || !redirectUri) {
    throw new Error('Missing authorization code or redirect URI.');
  }

  const body = new URLSearchParams({
    code: String(code),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: String(redirectUri),
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    const message =
      tokens.error_description ||
      tokens.error ||
      `Google token exchange failed (${tokenRes.status})`;
    throw new Error(message);
  }

  if (!tokens.id_token) {
    throw new Error('Google did not return an ID token.');
  }

  return {
    id_token: tokens.id_token,
    access_token: tokens.access_token || null,
  };
}
