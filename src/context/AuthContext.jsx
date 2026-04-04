import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { getSession } from '../services/auth.service';

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
    const initializeAuth = async () => {
      try {
        const initialSession = await getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error('Auth initialization error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
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
