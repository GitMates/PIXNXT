import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { readWorkersResetToken } from '../../../lib/api/client';
import { PasswordField } from './PasswordField';

export const ResetPasswordForm = ({ onSuccess, onRequestNewLink }) => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Workers: the ?token= link is self-sufficient — no recovery session.
    if (readWorkersResetToken()) setSessionReady(true);
    else setError('This reset link has expired or was already used. Request a new one below.');
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!sessionReady) {
      setError('Your reset link is still loading. Wait a moment, or request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not update your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-field">
        <label htmlFor="new-password" className="auth-label">New password</label>
        <PasswordField
          id="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="new-password-confirm" className="auth-label">Retype password</label>
        <PasswordField
          id="new-password-confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={isLoading || !sessionReady}
        className="auth-submit"
        aria-busy={isLoading}
      >
        {isLoading ? 'Saving…' : 'Save new password'}
      </button>

      {onRequestNewLink ? (
        <p className="auth-toggle">
          <button type="button" onClick={onRequestNewLink} className="auth-toggle-btn">
            Send a new reset link
          </button>
        </p>
      ) : null}
    </form>
  );
};
