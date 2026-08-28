import { supabase } from '../lib/supabase/client';

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

function authRedirectTo(path = '/auth') {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/**
 * Starts Google OAuth (login and sign-up share this flow).
 */
export async function signInWithGoogle() {
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
