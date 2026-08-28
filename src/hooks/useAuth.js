import { useAuthContext } from '../context/AuthContext';
import * as authService from '../services/auth.service';

/**
 * Custom hook to interact with authentication state and actions.
 * @returns {Object} - Auth state and utility functions.
 */
export const useAuth = () => {
  const context = useAuthContext();

  const login = async (credentials) => {
    return await authService.signInWithEmail(credentials);
  };

  const signup = async (credentials) => {
    return await authService.signUpWithEmail(credentials);
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
    return await authService.signOut();
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
