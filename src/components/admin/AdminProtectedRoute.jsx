import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
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
