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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.error('Signup error:', error.message);
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
