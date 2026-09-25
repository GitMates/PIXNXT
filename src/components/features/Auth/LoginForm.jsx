import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PasswordField } from './PasswordField';
import { AuthOrDivider, GoogleAuthButton } from './AuthSocial';

/**
 * Login Form component for authenticating users.
 */
export const LoginForm = ({ onSuccess, onToggle, onForgot }) => {
  const { login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [step, setStep] = useState('credentials');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login({ email, password });
      if (result?.requiresTwoFactor) {
        setChallengeId(result.challengeId || '');
        setEmailHint(result.emailHint || email);
        setStep('otp');
        setOtpCode('');
        return;
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await verifyTwoFactor({ challengeId, code: otpCode });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <form onSubmit={handleOtpSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-otp">Verification code</label>
          <p className="auth-field-hint" style={{ marginBottom: 8, opacity: 0.8, fontSize: 13 }}>
            We emailed a 6-digit code to {emailHint || 'your login email'}.
          </p>
          <div className="auth-input-shell">
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="auth-input"
              required
              minLength={6}
              maxLength={6}
              autoFocus
            />
          </div>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={isLoading || otpCode.length < 6}
          className="auth-submit"
          aria-busy={isLoading}
        >
          {isLoading ? 'Verifying…' : 'Verify and continue'}
        </button>

        <p className="auth-toggle">
          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => {
              setStep('credentials');
              setChallengeId('');
              setOtpCode('');
              setError('');
            }}
          >
            Back to log in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentialsSubmit} className="auth-form">
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
