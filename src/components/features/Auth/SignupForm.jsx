import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PasswordField } from './PasswordField';
import { AuthOrDivider, GoogleAuthButton } from './AuthSocial';

/**
 * Signup Form component for new user registration.
 */
export const SignupForm = ({ onSuccess, onToggle }) => {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, type: 'success', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await signup({ email, password });

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setModal({
          show: true,
          type: 'error',
          message: 'This email address is already registered. Please use another email address.',
        });
        return;
      }

      setModal({
        show: true,
        type: 'success',
        message: 'We sent a confirmation email. Please confirm your email address.',
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
          message: 'This email address is already registered. Please use another email address.',
        });
      } else if (
        errMsg.toLowerCase().includes('rate limit') ||
        errMsg.toLowerCase().includes('too many requests')
      ) {
        setModal({
          show: true,
          type: 'error',
          message: 'Signup rate limit exceeded. Please wait a few minutes before trying again.',
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
          <label className="auth-label" htmlFor="signup-email">Email address</label>
          <div className="auth-input-shell">
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
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

        <div className="auth-field">
          <label htmlFor="signup-password-confirm" className="auth-label">Retype password</label>
          <PasswordField
            id="signup-password-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="auth-submit"
          aria-busy={isLoading}
        >
          {isLoading ? 'Creating studio…' : 'Create a studio'}
        </button>

        <AuthOrDivider />
        <GoogleAuthButton disabled={isLoading} onError={setError} />

        <p className="auth-toggle">
          Already have a studio?{' '}
          <button type="button" onClick={onToggle} className="auth-toggle-btn">
            Log in
          </button>
        </p>
      </form>

      {modal.show && (
        <div className="auth-dialog-overlay">
          <div className="auth-dialog" role="dialog" aria-modal="true">
            <h3 className="auth-dialog__title">
              {modal.type === 'success' ? 'Confirm your email' : 'Email already exists'}
            </h3>
            <p className="auth-dialog__body">{modal.message}</p>
            <button
              type="button"
              onClick={() => {
                const currentType = modal.type;
                setModal({ show: false, type: 'success', message: '' });
                if (currentType === 'success') {
                  onSuccess?.();
                }
              }}
              className="auth-submit"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};
