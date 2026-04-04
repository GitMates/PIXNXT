import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Component to protect routes from unauthorized access.
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Protected component.
 */
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page, preserving the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};
