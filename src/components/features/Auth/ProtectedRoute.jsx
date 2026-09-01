import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { AppLoader } from '../../ui/AppLoading';

/**
 * Component to protect routes from unauthorized access.
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Protected component.
 */
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoader label="Loading" variant="page" />;
  }

  if (!user) {
    // Redirect to auth page, preserving the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};
