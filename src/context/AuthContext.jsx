import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api/client';
import {
  resolveAuthSession,
  resolveInitialAuthSession,
  ensurePhotographerProfile,
} from '../services/auth.service';

const AuthContext = createContext();

function sameAuthUser(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.updated_at === b.updated_at;
}

function sameAuthSession(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.access_token === b.access_token && a.expires_at === b.expires_at;
}

/**
 * Provider component for Authentication state.
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child elements.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuthState = useCallback(({ user: nextUser, session: nextSession }) => {
    setSession((prev) => (sameAuthSession(prev, nextSession) ? prev : nextSession));
    setUser((prev) => (sameAuthUser(prev, nextUser) ? prev : nextUser));
  }, []);

  // Re-resolve session on demand (required in Workers mode — there is no
  // realtime subscription, so login/signup/OAuth landing must call this
  // before navigating to a ProtectedRoute, or it will bounce to /auth).
  const refresh = useCallback(async () => {
    const resolved = await resolveAuthSession();
    applyAuthState(resolved);
    return resolved;
  }, [applyAuthState]);

  useEffect(() => {
    // Initialize session and user state
    const initializeAuth = async () => {
      try {
        const resolved = await resolveInitialAuthSession();
        applyAuthState(resolved);
        if (resolved.user) {
          void ensurePhotographerProfile(resolved.user).catch((err) => {
            console.warn('Could not ensure photographer profile:', err?.message || err);
          });
          // Stamp last login (admin User Management) fire-and-forget.
          // Authed-only: firing this for logged-out visitors just 401s.
          void apiFetch('/v1/me/last-login', { method: 'POST', body: {} }).catch((err) => {
            console.warn('Could not stamp last login:', err?.message || err);
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error.message);
        applyAuthState({ user: null, session: null });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void resolveAuthSession().then(applyAuthState);
    };
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);

    // Workers is the only backend: no realtime subscription — session resolves via
    // the refresh cookie (resolveInitialAuthSession delegates to workersAuth).
    setLoading(false);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [applyAuthState]);

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    refresh,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume the AuthContext.
 * @returns {Object} - Auth context value.
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
