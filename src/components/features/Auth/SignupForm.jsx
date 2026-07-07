import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PasswordField } from './PasswordField';

/**
 * Signup Form component for new user registration.
 */
export const SignupForm = ({ onSuccess, onToggle }) => {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, type: 'success', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await signup({ email, password });
      
      // Check if user already exists (Supabase empty identities when confirmation is enabled)
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setModal({
          show: true,
          type: 'error',
          message: 'This email address is already registered. Please use another email address.'
        });
        return;
      }

      setModal({
        show: true,
        type: 'success',
        message: 'We sent a confirmation email. Please confirm your email address.'
      });
    } catch (err) {
      const errMsg = err.message || '';
      if (
        errMsg.toLowerCase().includes('already registered') || 
        errMsg.toLowerCase().includes('already exists') || 
        errMsg.toLowerCase().includes('email_exists')
      ) {
        setModal({
          show: true,
          type: 'error',
          message: 'This email address is already registered. Please use another email address.'
        });
      } else {
        setError(errMsg || 'Failed to sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-email">Email Address</label>
          <div className="auth-input-shell neu-inset auth-input-shell--pill">
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="auth-input"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-password" className="auth-label">Password</label>
          <PasswordField
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="auth-submit neu-pill"
          aria-busy={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>

        <p className="auth-toggle">
          Already have an account?{' '}
          <button type="button" onClick={onToggle} className="auth-toggle-btn">
            Log In
          </button>
        </p>
      </form>

      {modal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-[2000] p-4">
          <div className="bg-white p-7 rounded-2xl max-w-[360px] w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-[cgFadeIn_0.2s_ease]">
            {modal.type === 'success' ? (
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
            )}
            <h3 className="text-[17px] font-bold text-gray-900 mb-2">
              {modal.type === 'success' ? 'Confirm Your Email' : 'Email Already Exists'}
            </h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
              {modal.message}
            </p>
            <button
              type="button"
              onClick={() => {
                const currentType = modal.type;
                setModal({ show: false, type: 'success', message: '' });
                if (currentType === 'success') {
                  onSuccess?.();
                }
              }}
              className="auth-submit neu-pill mt-0 w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};
