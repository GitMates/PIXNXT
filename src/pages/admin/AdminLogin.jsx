import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/features/Auth/PasswordField';

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
    supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) {
          setIsUserAdmin(Boolean(data));
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      // After sign-in, verify the user is in the admins table
      const { data: sessionData } = await supabase.auth.getUser();
      const signedInUser = sessionData?.user;

      if (signedInUser) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('id', signedInUser.id)
          .maybeSingle();

        if (!adminRow) {
          setError('Access denied. This account does not have admin privileges.');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafbfc] px-4 font-inter">
      <div className="w-full max-w-[440px] p-10 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-indigo-50 rounded-2xl">
             <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight uppercase font-serif">
            Admin Portal
          </h1>
          <p className="mt-3 text-[17px] text-gray-500 leading-relaxed max-w-[280px] mx-auto">
            Log in to manage the platform and user accounts.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              shellClassName="relative"
              inputClassName="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm pr-10"
              actionClassName="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || loading}
            className="mt-2 px-6 py-2.5 w-full text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing In...' : 'Log In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6">
          <span className="text-[14px] font-medium text-gray-400 uppercase tracking-widest">Secured by Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

