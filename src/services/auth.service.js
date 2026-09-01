import { supabase } from '../lib/supabase/client';
import {
  buildGoogleStudioAuthUrl,
  getGoogleStudioCallbackUrl,
  GOOGLE_STUDIO_AUTH_STATE_KEY,
  isGoogleStudioAuthConfigured,
  isGoogleStudioCallbackPath,
} from '../lib/googleStudioAuth';

/**
 * Signs in a user with email and password.
 * @param {Object} credentials - User credentials.
 * @param {string} credentials.email - User email.
 * @param {string} credentials.password - User password.
 * @returns {Promise<Object>} - Auth data including user and session.
 */
export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Login error:', error.message);
    throw error;
  }
  
  return data;
}

/**
 * Registers a new user with email and password.
 * @param {Object} credentials - User credentials.
 * @param {string} credentials.email - User email.
 * @param {string} credentials.password - User password.
 * @returns {Promise<Object>} - Auth data including user and session.
 */
export async function signUpWithEmail({ email, password }) {
  const fallbackName = email.split('@')[0] || 'Photographer';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authRedirectTo('/auth?confirmed=1'),
      data: {
        display_name: fallbackName,
        full_name: fallbackName,
        name: fallbackName,
        username: fallbackName
      }
    }
  });
  
  if (error) {
    console.error('Signup error:', error.message);
    throw error;
  }
  
  return data;
}

function trimTrailingSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

function authRedirectTo(path = '/auth') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${trimTrailingSlash(window.location.origin)}${normalizedPath}`;
  }
  const fromEnv = trimTrailingSlash(import.meta.env.VITE_PUBLIC_SITE_URL);
  if (fromEnv) return `${fromEnv}${normalizedPath}`;
  return normalizedPath;
}

function readAuthUrlParams() {
  if (typeof window === 'undefined') {
    return { hash: new URLSearchParams(), search: new URLSearchParams() };
  }
  return {
    hash: new URLSearchParams(window.location.hash.replace(/^#/, '')),
    search: new URLSearchParams(window.location.search),
  };
}

/** True when the URL is a Supabase password-recovery callback (hash, query, or mode=reset). */
export function isPasswordRecoveryCallback() {
  if (typeof window === 'undefined') return false;
  const { hash, search } = readAuthUrlParams();
  if (hash.get('type') === 'recovery' || search.get('type') === 'recovery') return true;
  if (search.get('mode') === 'reset') return true;
  if (search.has('token_hash') && search.get('type') === 'recovery') return true;
  return false;
}

/** True when the URL contains Supabase OAuth / email-confirmation callback params. */
export function hasAuthCallbackInUrl() {
  if (typeof window === 'undefined') return false;
  const { hash, search } = readAuthUrlParams();
  if (
    search.has('code') &&
    isGoogleStudioCallbackPath(window.location.pathname)
  ) {
    return false;
  }
  if (isPasswordRecoveryCallback()) return true;
  return (
    hash.has('access_token') ||
    hash.has('error') ||
    hash.has('error_description') ||
    search.has('code') ||
    search.has('token_hash')
  );
}

/**
 * Resolves session on first load, waiting briefly when the URL carries auth tokens.
 */
export async function resolveInitialAuthSession() {
  if (!hasAuthCallbackInUrl()) {
    return resolveAuthSession();
  }

  return new Promise((resolve) => {
    let settled = false;
    let subscription = null;
    let timeoutId = null;

    const finish = async () => {
      if (settled) return;
      settled = true;
      subscription?.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      resolve(await resolveAuthSession());
    };

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'PASSWORD_RECOVERY'
      ) {
        void finish();
      }
    });
    subscription = data.subscription;

    timeoutId = setTimeout(() => void finish(), 4000);

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) void finish();
    });
  });
}

/**
 * Starts Google OAuth via Supabase (fallback — Google shows *.supabase.co on the consent screen).
 */
async function signInWithGoogleViaSupabase() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectTo('/auth'),
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    console.error('Google sign-in error:', error.message);
    throw error;
  }

  if (data?.url) {
    window.location.assign(data.url);
  }

  return data;
}

/**
 * Starts Google OAuth (login and sign-up share this flow).
 * When VITE_GOOGLE_CLIENT_ID is set, redirects through Google with a pixnxt.in callback
 * so the account chooser shows your domain instead of *.supabase.co.
 */
export async function signInWithGoogle() {
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (clientId) {
    window.location.assign(buildGoogleStudioAuthUrl(clientId));
    return { provider: 'google' };
  }
  return signInWithGoogleViaSupabase();
}

/**
 * Finish studio Google login after redirect to /auth/google/callback?code=...
 */
export async function completeGoogleStudioSignIn(code, state) {
  const expectedState = sessionStorage.getItem(GOOGLE_STUDIO_AUTH_STATE_KEY);

  if (!expectedState || !state || expectedState !== state) {
    throw new Error('Google sign-in expired or was interrupted. Please try again.');
  }

  const redirectUri = getGoogleStudioCallbackUrl();
  const res = await fetch('/api/google-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok === false) {
    throw new Error(payload.error || 'Google sign-in failed.');
  }

  const tokens = payload.result || payload;
  if (!tokens?.id_token) {
    throw new Error('Google sign-in failed — no ID token returned.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
    access_token: tokens.access_token || undefined,
  });

  if (error) {
    console.error('Supabase Google token sign-in error:', error.message);
    throw error;
  }

  sessionStorage.removeItem(GOOGLE_STUDIO_AUTH_STATE_KEY);
  return data;
}

export { isGoogleStudioAuthConfigured };

/**
 * Create a photographers row for first-time OAuth / email users when missing.
 */
export async function ensurePhotographerProfile(user) {
  if (!user?.id) return null;

  const existing = await getProfile(user.id);
  if (existing) return existing;

  const meta = user.user_metadata || {};
  const email = String(user.email || '').trim().toLowerCase();
  const fullName =
    String(meta.full_name || meta.name || '').trim() ||
    email.split('@')[0] ||
    'Photographer';
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');
  const slugBase = email.split('@')[0] || user.id.slice(0, 8);
  const showcaseSlug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'studio';

  const { galleryService } = await import('./gallery.service');
  return galleryService.updatePhotographerProfile(user.id, {
    email,
    contact_email: email,
    display_name: fullName,
    business_name: fullName,
    first_name: firstName,
    last_name: lastName,
    profile_icon_url: meta.avatar_url || meta.picture || null,
    showcase_slug: showcaseSlug,
  });
}

export function readOAuthCallbackError() {
  if (typeof window === 'undefined') return null;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error =
    search.get('error_description') ||
    search.get('error') ||
    hash.get('error_description') ||
    hash.get('error');

  if (!error) return null;

  const decoded = decodeURIComponent(String(error).replace(/\+/g, ' '));
  if (/provider is not enabled/i.test(decoded)) {
    return 'Google sign-in is not enabled yet. Enable the Google provider in Supabase → Authentication → Providers.';
  }
  if (/access_denied/i.test(decoded)) {
    return 'Google sign-in was cancelled.';
  }
  return decoded;
}

export function clearOAuthCallbackParams() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('code');
  url.searchParams.delete('token_hash');
  url.searchParams.delete('type');
  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

/** Strip recovery tokens from the URL after a successful password change. */
export function clearPasswordRecoveryParams() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.searchParams.delete('code');
  url.searchParams.delete('token_hash');
  url.searchParams.delete('type');
  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

/**
 * Emails a password-reset link that returns to the auth page.
 */
export async function sendPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectTo('/auth?mode=reset'),
  });

  if (error) {
    console.error('Password reset error:', error.message);
    throw error;
  }

  return data;
}

/**
 * Sets a new password during the recovery session.
 */
export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error('Password update error:', error.message);
    throw error;
  }

  return data;
}

/**
 * Signs out the current user.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error.message);
    throw error;
  }
}

/** Refresh when the access token expires within this many seconds. */
const SESSION_REFRESH_BUFFER_SEC = 60;

function isSessionExpired(session) {
  if (!session?.expires_at) return false;
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at <= now + SESSION_REFRESH_BUFFER_SEC;
}

/**
 * Returns a valid session, refreshing when the JWT is expired or near expiry.
 * Clears auth state when the refresh token is no longer valid.
 * @returns {Promise<{ user: Object|null, session: Object|null }>}
 */
export async function resolveAuthSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Session retrieval error:', error.message);
    return { user: null, session: null };
  }

  if (!session) {
    return { user: null, session: null };
  }

  if (!isSessionExpired(session)) {
    return { user: session.user ?? null, session };
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session) {
    console.warn('Session refresh failed:', refreshError?.message ?? 'no session');
    await supabase.auth.signOut().catch(() => {});
    return { user: null, session: null };
  }

  return { user: refreshed.session.user ?? null, session: refreshed.session };
}

/** Error code when refresh fails or there is no valid session. */
export const AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED';

export function isAuthExpiredError(error) {
  if (!error) return false;
  if (error.code === AUTH_SESSION_EXPIRED) return true;
  const message = String(error.message || error.msg || '').toLowerCase();
  return (
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('session expired') ||
    error.status === 401 ||
    error.statusCode === 401
  );
}

/**
 * Refresh if needed and return a valid session, or throw with AUTH_SESSION_EXPIRED.
 * @returns {Promise<{ user: Object, session: Object }>}
 */
export async function ensureAuthSession() {
  const { user, session } = await resolveAuthSession();
  if (!user || !session) {
    const err = new Error('Your session has expired. Please sign in again.');
    err.code = AUTH_SESSION_EXPIRED;
    throw err;
  }
  return { user, session };
}

/**
 * Retrieves the current session.
 * @returns {Promise<Object|null>} - Current session data.
 */
export async function getSession() {
  const { session } = await resolveAuthSession();
  return session;
}

/**
 * Retrieves the currently authenticated user.
 * @returns {Promise<Object|null>} - Current user object.
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('User retrieval error:', error.message);
    throw error;
  }
  
  return user;
}
/**
 * Retrieves the profile of the photographer from the database.
 * @param {string} userId - Auth user ID.
 * @returns {Promise<Object|null>} - Photographer profile.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('photographers')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No profile found
    console.error('Profile retrieval error:', error.message);
    throw error;
  }

  return data;
}
