import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { LoginForm, SignupForm } from '../components/features/Auth';
import { ForgotPasswordForm } from '../components/features/Auth/ForgotPasswordForm';
import { ResetPasswordForm } from '../components/features/Auth/ResetPasswordForm';
import { useAuth } from '../hooks/useAuth';
import { clearOAuthCallbackParams, readOAuthCallbackError, completeGoogleStudioSignIn } from '../services/auth.service';
import { isGoogleStudioCallbackPath } from '../lib/googleStudioAuth';
import './AuthPage.css';

const COPY = {
  login: {
    title: 'Welcome back,',
    subtitle: 'Sign in to your studio.',
  },
  signup: {
    title: 'Create a studio',
    subtitle: 'Start delivering photographs to your clients.',
  },
  forgot: {
    title: 'Forgot password',
    subtitle: 'We’ll email you a link to choose a new one.',
  },
  reset: {
    title: 'Choose a new password',
    subtitle: 'Then sign in to your studio.',
  },
};

/**
 * AuthPage — split studio login / signup (no card).
 */
const AuthPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const emailConfirmed = searchParams.get('confirmed') === '1';
  const { user, loading } = useAuth();

  const [view, setView] = useState(
    mode === 'signup' ? 'signup' : mode === 'reset' ? 'reset' : 'login'
  );
  const [oauthError, setOauthError] = useState(
    () => location.state?.oauthError || ''
  );
  const [confirmBanner, setConfirmBanner] = useState('');
  const [googleCallbackBusy, setGoogleCallbackBusy] = useState(
    () => isGoogleStudioCallbackPath(location.pathname) && Boolean(searchParams.get('code'))
  );
  const navigate = useNavigate();
  const googleExchangeRef = useRef(null);

  useEffect(() => {
    if (!isGoogleStudioCallbackPath(location.pathname)) return undefined;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const googleError = searchParams.get('error');

    if (googleError) {
      const description = searchParams.get('error_description');
      const message = description
        ? decodeURIComponent(String(description).replace(/\+/g, ' '))
        : 'Google sign-in was cancelled.';
      setGoogleCallbackBusy(false);
      navigate('/auth', { replace: true, state: { oauthError: message } });
      return undefined;
    }

    if (!code) return undefined;
    if (googleExchangeRef.current === code) return undefined;
    googleExchangeRef.current = code;

    setGoogleCallbackBusy(true);

    (async () => {
      try {
        await completeGoogleStudioSignIn(code, state);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setGoogleCallbackBusy(false);
        navigate('/auth', {
          replace: true,
          state: { oauthError: err?.message || 'Google sign-in failed.' },
        });
      }
    })();

    return undefined;
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (location.state?.oauthError) {
      setOauthError(location.state.oauthError);
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: { ...location.state, oauthError: undefined },
      });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    const callbackError = readOAuthCallbackError();
    if (callbackError) {
      setOauthError(callbackError);
      clearOAuthCallbackParams();
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('type') === 'signup' || emailConfirmed) {
      setConfirmBanner('Email confirmed! Signing you in…');
    }
  }, [emailConfirmed]);

  useEffect(() => {
    if (mode === 'signup') setView('signup');
    else if (mode === 'login') setView('login');
    else if (mode === 'reset') setView('reset');
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('type') === 'recovery') setView('reset');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setView('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || !user || view === 'reset' || googleCallbackBusy) return;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('type') === 'signup' || emailConfirmed) {
      clearOAuthCallbackParams();
      setConfirmBanner('Email confirmed! Welcome to your studio.');
    }

    const from = location.state?.from?.pathname;
    navigate(from && from !== '/auth' ? from : '/dashboard', { replace: true });
  }, [user, loading, view, navigate, location.state, emailConfirmed, googleCallbackBusy]);

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  const copy = COPY[view] || COPY.login;

  if (googleCallbackBusy) {
    return null;
  }

  return (
    <div className="auth-page">
      <section className="auth-page__stage" aria-hidden="true">
        <div className="auth-page__brand">PIX NXT</div>
        <blockquote className="auth-page__quote">
          <p>Six hundred photographs, delivered before the mehendi finished.</p>
          <cite>KARAKOVAN PHOTOGRAPHY · COIMBATORE</cite>
        </blockquote>
      </section>

      <section className="auth-page__panel">
        <div className="auth-page__form">
          <header className="auth-page__header">
            <h1 className="auth-page__title">{copy.title}</h1>
            <p className="auth-page__subtitle">{copy.subtitle}</p>
          </header>

          {oauthError ? (
            <p className="auth-error auth-page__oauth-error" role="alert">
              {oauthError}
            </p>
          ) : null}

          {confirmBanner ? (
            <p className="auth-page__confirm-banner" role="status">
              {confirmBanner}
            </p>
          ) : null}

          {view === 'login' && (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onToggle={() => setView('signup')}
              onForgot={() => setView('forgot')}
            />
          )}
          {view === 'signup' && (
            <SignupForm
              onSuccess={handleAuthSuccess}
              onToggle={() => setView('login')}
            />
          )}
          {view === 'forgot' && (
            <ForgotPasswordForm onBack={() => setView('login')} />
          )}
          {view === 'reset' && (
            <ResetPasswordForm onSuccess={handleAuthSuccess} />
          )}
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
