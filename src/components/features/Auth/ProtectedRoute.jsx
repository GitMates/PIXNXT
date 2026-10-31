import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useOnboardingGate } from '../../../hooks/useOnboardingGate';
import { ONBOARDING_PATH } from '../../../lib/onboarding';
import { AppLoader } from '../../ui/AppLoading';

/**
 * Component to protect routes from unauthorized access.
 *
 * Signed-in users who have not completed first-run onboarding are sent to
 * `/onboarding` and returned to the page they originally asked for afterwards.
 * Pass `requireOnboarding={false}` for the onboarding route itself.
 */
export const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { checking, needsOnboarding } = useOnboardingGate(
    requireOnboarding ? user?.id : null,
  );

  if (loading) {
    return <AppLoader label="Loading" variant="page" />;
  }

  if (!user) {
    // Keep deep link across the /auth bounce (pathname alone drops ?id=).
    try {
      const full = `${location.pathname}${location.search || ''}${location.hash || ''}`;
      if (full && full !== '/auth') {
        sessionStorage.setItem('pixnxt_auth_return', full);
      }
    } catch {
      /* private mode */
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireOnboarding && checking) {
    return <AppLoader label="Checking your studio" variant="page" />;
  }

  if (
    requireOnboarding &&
    needsOnboarding &&
    location.pathname !== ONBOARDING_PATH
  ) {
    return <Navigate to={ONBOARDING_PATH} state={{ from: location }} replace />;
  }

  return children;
};
