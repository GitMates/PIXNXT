import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppLoader } from '../ui/AppLoading';
import { apiFetch } from '../../lib/api/client';

export const AdminProtectedRoute = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setCheckingRole(false);
        }
        return;
      }

      try {
        // Admin flag comes from GET /v1/me (returns {photographer, isAdmin}).
        const me = await apiFetch('/v1/me');
        if (isMounted) {
          setIsAdmin(Boolean(me?.isAdmin));
          setCheckingRole(false);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
          setCheckingRole(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  if (authLoading || checkingRole) {
    return <AppLoader label="Loading admin" variant="page" />;
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (isAdmin === false) {
    // If authenticated but not an admin, redirect out of the admin panel
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
