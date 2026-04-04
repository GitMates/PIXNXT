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

/**
 * Retrieves the current session.
 * @returns {Promise<Object|null>} - Current session data.
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Session retrieval error:', error.message);
    throw error;
  }
  
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
