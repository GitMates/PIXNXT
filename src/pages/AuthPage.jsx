import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LoginForm, SignupForm } from '../components/features/Auth';
import { ForgotPasswordForm } from '../components/features/Auth/ForgotPasswordForm';
import { ResetPasswordForm } from '../components/features/Auth/ResetPasswordForm';
import { useAuth } from '../hooks/useAuth';
import {
  clearOAuthCallbackParams,
  clearPasswordRecoveryParams,
  completeGoogleStudioSignIn,
  isPasswordRecoveryCallback,
  readOAuthCallbackError,
} from '../services/auth.service';
import { isGoogleStudioCallbackPath } from '../lib/googleStudioAuth';
import { isWorkersSuccessPath } from '../lib/api/client';
import { AuthVintagePoster } from './AuthVintagePoster';
import './AuthVintagePoster.css';
import './AuthPage.css';

const WORDMARK_PATHS = [
  'M17 22h153c85 0 140 38 140 121v14c0 83-55 121-140 121H66v150H17zM66 67v167h99c60 0 95-27 95-79v-10c0-52-35-78-95-78z',
  'M489 22h50v407h-50z',
  'M708 22h60l110 153 110-153h60L907 214l157 215h-60L876 253 752 429h-60l156-215z',
  'M1217 22h49v313l309-318h10v412h-49V118l-309 317h-10z',
  'M1754 22h60l110 153 110-153h60l-141 192 157 215h-60l-128-176-124 176h-60l156-215z',
  'M2219 22h338v46h-144v361h-50V68h-144z',
];

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

const AUTH_RETURN_KEY = 'pixnxt_auth_return';

/** Restore the page the user tried to open (include ?id= query). */
function resolvePostAuthPath(fromLocation) {
  const fromPath = fromLocation
    ? `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '';
  let stored = '';
  try {
    stored = sessionStorage.getItem(AUTH_RETURN_KEY) || '';
    sessionStorage.removeItem(AUTH_RETURN_KEY);
  } catch {
    /* private mode */
  }
  const candidate = fromPath && fromPath !== '/auth' ? fromPath : stored;
  if (!candidate || candidate === '/auth' || candidate.startsWith('/auth?') || candidate.startsWith('/auth/')) {
    return '/client-gallery';
  }
  return candidate;
}

/**
 * AuthPage — vintage split studio login / signup (functionality unchanged).
 */
const AuthPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const emailConfirmed = searchParams.get('confirmed') === '1';
  const { user, loading, refresh } = useAuth();
  const posterRef = useRef(null);

  const [view, setView] = useState(() => {
    if (mode === 'signup') return 'signup';
    if (mode === 'reset' || isPasswordRecoveryCallback()) return 'reset';
    return 'login';
  });
  const [recoveryActive, setRecoveryActive] = useState(() => isPasswordRecoveryCallback());
  const [oauthError, setOauthError] = useState(
    () => location.state?.oauthError || ''
  );
  const [confirmBanner, setConfirmBanner] = useState('');
  const [googleCallbackBusy, setGoogleCallbackBusy] = useState(
    () => isGoogleStudioCallbackPath(location.pathname) && Boolean(searchParams.get('code'))
  );
  const [workersCallbackBusy, setWorkersCallbackBusy] = useState(
    () => isWorkersSuccessPath()
  );
  const navigate = useNavigate();
  const googleExchangeRef = useRef(null);

  useEffect(() => {
    if (!isWorkersSuccessPath()) return undefined;
    let cancelled = false;
    setWorkersCallbackBusy(true);
    (async () => {
      try {
        const resolved = await refresh?.();
        if (cancelled) return;
        if (resolved?.user) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth', {
            replace: true,
            state: { oauthError: 'Google sign-in failed. Please try again.' },
          });
        }
      } catch {
        if (!cancelled) {
          navigate('/auth', {
            replace: true,
            state: { oauthError: 'Google sign-in failed. Please try again.' },
          });
        }
      } finally {
        if (!cancelled) setWorkersCallbackBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate, refresh]);

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

    if (isPasswordRecoveryCallback()) {
      setRecoveryActive(true);
      setView('reset');
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('type') === 'recovery') {
      setRecoveryActive(true);
      setView('reset');
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (loading || !user || googleCallbackBusy || workersCallbackBusy) return;
    if (view === 'reset' || recoveryActive || isPasswordRecoveryCallback()) return;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('type') === 'signup' || emailConfirmed) {
      clearOAuthCallbackParams();
      setConfirmBanner('Email confirmed! Welcome to your studio.');
    }

    navigate(resolvePostAuthPath(location.state?.from), { replace: true });
  }, [user, loading, view, recoveryActive, navigate, location.state, emailConfirmed, googleCallbackBusy, workersCallbackBusy]);

  const handleAuthSuccess = async () => {
    if (recoveryActive || view === 'reset') {
      clearPasswordRecoveryParams();
      setRecoveryActive(false);
    }
    try {
      posterRef.current?.playEntry?.();
    } catch {
      /* ambient poster only */
    }
    try {
      const resolved = await refresh?.();
      if (!resolved?.user) return;
    } catch {
      return;
    }
    navigate(resolvePostAuthPath(location.state?.from), { replace: true });
  };

  const copy = COPY[view] || COPY.login;

  if (googleCallbackBusy || workersCallbackBusy) {
    return null;
  }

  return (
    <div className="auth-page">
      <AuthVintagePoster ref={posterRef} />

      <main className="pane auth-page__panel">
        <div className="form auth-page__form">
          <Link className="wordmark" to="/" aria-label="PIXNXT home">
            <svg viewBox="0 0 2576 452" aria-hidden="true">
              <path fillRule="evenodd" d={WORDMARK_PATHS[0]} />
              {WORDMARK_PATHS.slice(1).map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          </Link>
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
            <ResetPasswordForm
              onSuccess={handleAuthSuccess}
              onRequestNewLink={() => setView('forgot')}
            />
          )}

          {view === 'login' ? (
            <p className="auth-demo demo">
              <button type="button" onClick={() => posterRef.current?.replay?.()}>
                Replay plates
              </button>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
