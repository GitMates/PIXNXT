import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { resolveAuthSession, ensurePhotographerProfile } from '../services/auth.service';

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

  useEffect(() => {
    // Initialize session and user state
    const applyAuthState = ({ user: nextUser, session: nextSession }) => {
      setSession((prev) => (sameAuthSession(prev, nextSession) ? prev : nextSession));
      setUser((prev) => (sameAuthUser(prev, nextUser) ? prev : nextUser));
    };

    const initializeAuth = async () => {
      try {
        const resolved = await resolveAuthSession();
        applyAuthState(resolved);
        if (resolved.user) {
          void ensurePhotographerProfile(resolved.user).catch((err) => {
            console.warn('Could not ensure photographer profile:', err?.message || err);
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

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        applyAuthState({
          user: nextSession?.user ?? null,
          session: nextSession,
        });
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          nextSession?.user
        ) {
          void ensurePhotographerProfile(nextSession.user).catch((err) => {
            console.warn('Could not ensure photographer profile:', err?.message || err);
          });
        }
        setLoading(false);
      }
    );

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
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
