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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signup({ email, password });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};
