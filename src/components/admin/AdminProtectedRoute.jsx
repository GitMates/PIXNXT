import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppLoader } from '../ui/AppLoading';
import { supabase } from '../../lib/supabase/client';

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
        const { data, error } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .single();

        if (isMounted) {
          if (error || !data) {
            setIsAdmin(false);
          } else {
            setIsAdmin(true);
          }
          setCheckingRole(false);
        }
      } catch (err) {
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
    // If authenticated but NOT in the admins table, redirect out of the admin panel
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
