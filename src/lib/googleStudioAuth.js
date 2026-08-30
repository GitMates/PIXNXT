/** Session key for CSRF state on direct Google OAuth (studio login). */
export const GOOGLE_STUDIO_AUTH_STATE_KEY = 'pixnxt_google_studio_oauth_state';

export const GOOGLE_STUDIO_CALLBACK_PATH = '/auth/google/callback';

export function isGoogleStudioAuthConfigured() {
  return Boolean(String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim());
}

export function getGoogleStudioCallbackUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/+$/, '')}${GOOGLE_STUDIO_CALLBACK_PATH}`;
  }
  const fromEnv = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return `${fromEnv}${GOOGLE_STUDIO_CALLBACK_PATH}`;
  return GOOGLE_STUDIO_CALLBACK_PATH;
}

/** True when the current URL is the Google → pixnxt.in OAuth return path. */
export function isGoogleStudioCallbackPath(pathname = '') {
  return String(pathname || '').replace(/\/+$/, '') === GOOGLE_STUDIO_CALLBACK_PATH;
}

export function buildGoogleStudioAuthUrl(clientId) {
  const state = crypto.randomUUID();
  sessionStorage.setItem(GOOGLE_STUDIO_AUTH_STATE_KEY, state);
  const redirectUri = getGoogleStudioCallbackUrl();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
