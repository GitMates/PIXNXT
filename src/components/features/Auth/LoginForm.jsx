import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PasswordField } from './PasswordField';
import { AuthOrDivider, GoogleAuthButton } from './AuthSocial';

/**
 * Login Form component for authenticating users.
 */
export const LoginForm = ({ onSuccess, onToggle, onForgot }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login({ email, password });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-field">
        <label className="auth-label" htmlFor="login-email">Email address</label>
        <div className="auth-input-shell">
          <input
            id="login-email"
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
        <div className="auth-label-row">
          <label htmlFor="login-password" className="auth-label">Password</label>
          <button type="button" className="auth-forgot" onClick={onForgot}>
            Forgot password?
          </button>
        </div>
        <PasswordField
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="auth-submit"
        aria-busy={isLoading}
      >
        {isLoading ? 'Signing in…' : 'Log in'}
      </button>

      <AuthOrDivider />
      <GoogleAuthButton disabled={isLoading} onError={setError} />

      <p className="auth-toggle">
        New to PIXNXT?{' '}
        <button type="button" onClick={onToggle} className="auth-toggle-btn">
          Create a studio
        </button>
      </p>
    </form>
  );
};
