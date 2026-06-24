import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { resolveAuthSession } from '../services/auth.service';

const AuthContext = createContext();

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
      setSession(nextSession);
      setUser(nextUser);
    };

    const initializeAuth = async () => {
      try {
        applyAuthState(await resolveAuthSession());
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

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
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
