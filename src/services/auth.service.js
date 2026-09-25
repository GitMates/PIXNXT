import { isWorkersResetCallback, isWorkersSuccessPath } from '../lib/api/client';
import {
  readOAuthCallbackError as workersReadOAuthCallbackError,
  clearOAuthCallbackParams as workersClearOAuthCallbackParams,
  clearPasswordRecoveryParams as workersClearPasswordRecoveryParams,
} from './workersAuth.service';
/** Lazy so the Workers bundle stays code-split. */
const workers = () => import('./workersAuth.service');
import {
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
  return (await workers()).signInWithEmail({ email, password });
}

/**
 * Registers a new user with email and password.
 * @param {Object} credentials - User credentials.
 * @param {string} credentials.email - User email.
 * @param {string} credentials.password - User password.
 * @returns {Promise<Object>} - Auth data including user and session.
 */
export async function signUpWithEmail({ email, password }) {
  return (await workers()).signUpWithEmail({ email, password });
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

/** True when the URL is a Workers password-recovery callback (?token= on /auth/reset). */
export function isPasswordRecoveryCallback() {
  if (typeof window === 'undefined') return false;
  if (isWorkersResetCallback()) return true;
  const { hash, search } = readAuthUrlParams();
  if (hash.get('type') === 'recovery' || search.get('type') === 'recovery') return true;
  if (search.get('mode') === 'reset') return true;
  if (search.has('token_hash') && search.get('type') === 'recovery') return true;
  return false;
}

/** True when the URL contains a Workers auth callback (/auth/reset or /auth/success). */
export function hasAuthCallbackInUrl() {
  if (typeof window === 'undefined') return false;
  if (isWorkersResetCallback() || isWorkersSuccessPath()) return true;
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
  return (await workers()).resolveInitialAuthSession();
}

/**
 * Starts Google OAuth (login and sign-up share this flow).
 * The Workers backend owns the OAuth exchange.
 */
export async function signInWithGoogle() {
  return (await workers()).signInWithGoogle();
}

/**
 * Finish studio Google login after redirect to /auth/google/callback?code=...
 */
export async function completeGoogleStudioSignIn(code, state) {
  return (await workers()).completeGoogleStudioSignIn(code, state);
}

export { isGoogleStudioAuthConfigured };

/**
 * Create a photographers row for first-time OAuth / email users when missing.
 */
export async function ensurePhotographerProfile(user) {
  return (await workers()).ensurePhotographerProfile(user);
}

export function readOAuthCallbackError() {
  if (typeof window === 'undefined') return null;
  return workersReadOAuthCallbackError();
}

export function clearOAuthCallbackParams() {
  if (typeof window === 'undefined') return;
  return workersClearOAuthCallbackParams();
}

/** Strip recovery tokens from the URL after a successful password change. */
export function clearPasswordRecoveryParams() {
  if (typeof window === 'undefined') return;
  return workersClearPasswordRecoveryParams();
}

/**
 * Emails a password-reset link that returns to the auth page.
 */
export async function sendPasswordReset(email) {
  return (await workers()).sendPasswordReset(email);
}

/**
 * Sets a new password during the recovery session.
 */
export async function updatePassword(password) {
  return (await workers()).updatePassword(password);
}

/**
 * Signed-in password change (current password required in Workers mode).
 */
export async function changePassword(currentPassword, newPassword) {
  return (await workers()).changePassword(currentPassword, newPassword);
}

export async function verifyTwoFactorLogin({ challengeId, code }) {
  return (await workers()).verifyTwoFactorLogin({ challengeId, code });
}

export async function startTwoFactorEnable() {
  return (await workers()).startTwoFactorEnable();
}

export async function confirmTwoFactorEnable({ challengeId, code }) {
  return (await workers()).confirmTwoFactorEnable({ challengeId, code });
}

export async function disableTwoFactor(opts) {
  return (await workers()).disableTwoFactor(opts);
}

export async function sendPasswordResetSelf() {
  return (await workers()).sendPasswordResetSelf();
}

export async function listAuthSessions() {
  return (await workers()).listAuthSessions();
}

export async function revokeAuthSession(sessionId) {
  return (await workers()).revokeAuthSession(sessionId);
}

/**
 * Signs out the current user.
 * @returns {Promise<void>}
 */
export async function signOut() {
  return (await workers()).signOut();
}

/**
 * Returns a valid session via the Workers backend.
 * @returns {Promise<{ user: Object|null, session: Object|null }>}
 */
export async function resolveAuthSession() {
  return (await workers()).resolveAuthSession();
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
  return (await workers()).ensureAuthSession();
}

/**
 * Retrieves the current session.
 * @returns {Promise<Object|null>} - Current session data.
 */
export async function getSession() {
  return (await workers()).getSession();
}

/**
 * Retrieves the currently authenticated user.
 * @returns {Promise<Object|null>} - Current user object.
 */
export async function getUser() {
  return (await workers()).getUser();
}
/**
 * Retrieves the profile of the photographer from the database.
 * @param {string} userId - Auth user ID.
 * @returns {Promise<Object|null>} - Photographer profile.
 */
export async function getProfile(userId) {
  return (await workers()).getProfile(userId);
}
