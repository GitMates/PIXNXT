import { useAuthContext } from '../context/AuthContext';
import * as authService from '../services/auth.service';
import { USE_WORKERS_AUTH } from '../lib/api/client';

/**
 * Custom hook to interact with authentication state and actions.
 * @returns {Object} - Auth state and utility functions.
 */
export const useAuth = () => {
  const context = useAuthContext();

  const login = async (credentials) => {
    const data = await authService.signInWithEmail(credentials);
    // Workers mode has no realtime subscription — push the new session into
    // context before callers navigate, or ProtectedRoute bounces to /auth.
    if (USE_WORKERS_AUTH) {
      try {
        await context.refresh?.();
      } catch {
        // refresh failure surfaces via context state / next resolve
      }
    }
    return data;
  };

  const signup = async (credentials) => {
    const data = await authService.signUpWithEmail(credentials);
    if (USE_WORKERS_AUTH && data?.session) {
      try {
        await context.refresh?.();
      } catch {
        // ignore — AuthPage effect will re-resolve
      }
    }
    return data;
  };

  const loginWithGoogle = async () => {
    return await authService.signInWithGoogle();
  };

  const requestPasswordReset = async (email) => {
    return await authService.sendPasswordReset(email);
  };

  const updatePassword = async (password) => {
    return await authService.updatePassword(password);
  };

  const logout = async () => {
    const data = await authService.signOut();
    // Workers mode: clear context too, or /auth sees stale user and bounces
    // straight back to /dashboard after logout.
    if (USE_WORKERS_AUTH) {
      try {
        await context.refresh?.();
      } catch {
        // ignore — context clears on next resolve
      }
    }
    return data;
  };

  return {
    ...context,
    login,
    signup,
    loginWithGoogle,
    requestPasswordReset,
    updatePassword,
    logout,
  };
};
