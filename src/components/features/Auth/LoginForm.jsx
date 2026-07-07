import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PasswordField } from './PasswordField';

/**
 * Login Form component for authenticating users.
 */
export const LoginForm = ({ onSuccess, onToggle }) => {
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
        <label className="auth-label" htmlFor="login-email">Email Address</label>
        <div className="auth-input-shell neu-inset auth-input-shell--pill">
          <input
            id="login-email"
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
        <label htmlFor="login-password" className="auth-label">Password</label>
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
        className="auth-submit neu-pill"
        aria-busy={isLoading}
      >
        {isLoading ? 'Signing In...' : 'Log In'}
      </button>

      <p className="auth-toggle">
        Don&apos;t have an account?{' '}
        <button type="button" onClick={onToggle} className="auth-toggle-btn">
          Sign Up
        </button>
      </p>
    </form>
  );
};
