import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api/client';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/features/Auth/PasswordField';
import '../../components/admin/adminStudio.css';

/** Lazy so the Workers auth service stays code-split. */
const workers = () => import('../../services/workersAuth.service');

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminCheckDone, setAdminCheckDone] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  // Where to send the user after login
  const from = location.state?.from?.pathname || '/admin/dashboard';

  // Check if already-authenticated user is actually an admin before auto-redirecting
  useEffect(() => {
    if (loading || !user) {
      setAdminCheckDone(true);
      return;
    }

    let isMounted = true;
    // Admin flag comes from GET /v1/me — no admins-table query from the client.
    apiFetch('/v1/me')
      .then((me) => {
        if (isMounted) {
          setIsUserAdmin(Boolean(me?.isAdmin));
          setAdminCheckDone(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsUserAdmin(false);
          setAdminCheckDone(true);
        }
      });

    return () => { isMounted = false; };
  }, [user, loading]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Login via the Cloudflare backend, then verify the
      // admin flag via GET /v1/me (login itself returns only tokens).
      await (await workers()).signInWithEmail({ email, password });
      const me = await apiFetch('/v1/me').catch(() => null);
      if (!me?.isAdmin) {
        setError('Access denied. This account does not have admin privileges.');
        await (await workers()).signOut().catch(() => {});
        setIsLoading(false);
        return;
      }
      // Successfully authenticated as admin
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated AND confirmed admin, bypass login
  if (!loading && adminCheckDone && user && isUserAdmin) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="admin-shell admin-login min-h-screen flex flex-col items-center justify-center px-4">
      <div className="ad-card w-full max-w-[440px] p-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-[var(--ad-sunk)]">
            <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="type-page-title text-[clamp(1.75rem,3vw,1.9rem)]">Admin portal</h1>
          <p className="mt-3 text-[17px] ad-muted-text leading-relaxed max-w-[280px] mx-auto">
            Log in to manage the platform and user accounts.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium ad-body-text">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-2 text-sm transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium ad-body-text">Password</label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              shellClassName="relative"
              inputClassName="ad-login-input w-full px-4 py-2 text-sm transition-all pr-10"
              actionClassName="absolute right-3 top-1/2 -translate-y-1/2 ad-faint-text hover:opacity-80 transition-opacity"
            />
          </div>

          {error && <p className="text-xs text-[var(--ad-bad)] font-medium" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || loading}
            className="mt-2 ad-btn-primary w-full px-6 py-2.5 text-sm disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing In...' : 'Log In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--ad-line)] flex items-center justify-center gap-6">
          <span className="text-[14px] font-medium ad-faint-text uppercase tracking-widest">Secured by Cloudflare</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
