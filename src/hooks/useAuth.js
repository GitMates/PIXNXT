import { useAuthContext } from '../context/AuthContext';
import * as authService from '../services/auth.service';

/**
 * Custom hook to interact with authentication state and actions.
 * @returns {Object} - Auth state and utility functions.
 */
export const useAuth = () => {
  const context = useAuthContext();

  const login = async (credentials) => {
    const data = await authService.signInWithEmail(credentials);
    if (data?.requiresTwoFactor) return data;
    // Workers has no realtime subscription — push the new session into
    // context before callers navigate, or ProtectedRoute bounces to /auth.
    try {
      await context.refresh?.();
    } catch {
      // refresh failure surfaces via context state / next resolve
    }
    return data;
  };

  const verifyTwoFactor = async ({ challengeId, code }) => {
    const data = await authService.verifyTwoFactorLogin({ challengeId, code });
    try {
      await context.refresh?.();
    } catch {
      // ignore
    }
    return data;
  };

  const signup = async (credentials) => {
    const data = await authService.signUpWithEmail(credentials);
    if (data?.session) {
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
    // Workers: clear context too, or /auth sees stale user and bounces
    // straight back to /dashboard after logout.
    try {
      await context.refresh?.();
    } catch {
      // ignore — context clears on next resolve
    }
    return data;
  };

  return {
    ...context,
    login,
    verifyTwoFactor,
    signup,
    loginWithGoogle,
    requestPasswordReset,
    updatePassword,
    logout,
  };
};
