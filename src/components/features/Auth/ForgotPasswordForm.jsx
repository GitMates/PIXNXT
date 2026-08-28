import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const ForgotPasswordForm = ({ onBack }) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send a reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-form">
        <p className="auth-success" role="status">
          If an account exists for {email}, we sent a reset link. Check your inbox.
        </p>
        <button type="button" className="auth-submit" onClick={onBack}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-field">
        <label className="auth-label" htmlFor="reset-email">Email address</label>
        <div className="auth-input-shell">
          <input
            id="reset-email"
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

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button type="submit" disabled={isLoading} className="auth-submit" aria-busy={isLoading}>
        {isLoading ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="auth-toggle">
        <button type="button" onClick={onBack} className="auth-toggle-btn">
          Back to log in
        </button>
      </p>
    </form>
  );
};
