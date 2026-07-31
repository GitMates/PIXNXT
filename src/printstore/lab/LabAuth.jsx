import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';
import './labTheme.css';

const fieldShell = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 44,
  borderRadius: 9999,
  padding: '0 14px 0 40px',
  position: 'relative',
  backgroundColor: 'oklch(0.952 0.005 85)',
  boxShadow: 'inset 3px 3px 7px oklch(0.4 0.01 70 / 0.1), inset -3px -3px 7px oklch(1 0.004 85 / 0.85)',
};

const fieldInput = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#1A1A1A',
  fontSize: 14,
  fontFamily: "var(--font-sans)",
};

export default function LabAuth() {
  const navigate = useNavigate();
  const { setLabUser } = useLabAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateForm = () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return false;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { data: existingUser, error: checkError } = await supabase
          .from('printstore_lab_users')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        const { data: newUser, error: insertError } = await supabase
          .from('printstore_lab_users')
          .insert({
            email: email.trim().toLowerCase(),
            password: password
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setSuccess('Account created successfully! Logging you in...');

        const sessionData = {
          id: newUser.id,
          email: newUser.email
        };

        localStorage.setItem('pixnxt_lab_session', JSON.stringify(sessionData));

        setTimeout(() => {
          setLabUser(sessionData);
          navigate('/lab/dashboard');
        }, 1200);
      } else {
        const { data: user, error: loginError } = await supabase
          .from('printstore_lab_users')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .eq('password', password)
          .maybeSingle();

        if (loginError) throw loginError;

        if (!user) {
          setError('Invalid email or password.');
          setLoading(false);
          return;
        }

        setSuccess('Authentication successful! Loading dashboard...');

        const sessionData = {
          id: user.id,
          email: user.email
        };

        localStorage.setItem('pixnxt_lab_session', JSON.stringify(sessionData));

        setTimeout(() => {
          setLabUser(sessionData);
          navigate('/lab/dashboard');
        }, 1200);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-mono lab-shell" style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#F9F9F7',
      color: '#1A1A1A',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "var(--font-sans)"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '44px 36px',
        border: '1px solid #ECEAE6',
        boxShadow: '-6px -6px 14px rgba(255,255,255,0.8), 6px 6px 18px rgba(0,0,0,0.05)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#1A1A1A',
            color: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16,
          }}>
            L
          </div>
          <h2 style={{
            fontSize: 28,
            fontWeight: 500,
            margin: '0 0 8px 0',
            color: '#1A1A1A',
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: '-0.02em',
          }}>
            Pixnxt Lab
          </h2>
          <p style={{ fontSize: 13, color: '#71717A', margin: 0 }}>
            {isSignUp ? 'Create an operator account' : 'Sign in to manage lab orders'}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            padding: '12px 14px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#207C50',
            padding: '12px 14px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20
          }}>
            <CheckCircle size={15} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
              Email Address
            </label>
            <div style={fieldShell}>
              <Mail size={15} color="#71717A" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="operator@pixnxt.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={fieldInput}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
              Password
            </label>
            <div style={fieldShell}>
              <Lock size={15} color="#71717A" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={fieldInput}
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
                Confirm Password
              </label>
              <div style={fieldShell}>
                <Lock size={15} color="#71717A" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={fieldInput}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neu-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              height: 44,
              borderRadius: 9999,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <span>Processing...</span>
            ) : isSignUp ? (
              <>
                <UserPlus size={15} />
                <span>Register operator</span>
              </>
            ) : (
              <>
                <LogIn size={15} />
                <span>Sign in to Lab</span>
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          borderTop: '1px solid #ECEAE6',
          paddingTop: 18
        }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1A1A1A',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
