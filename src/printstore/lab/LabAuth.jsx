import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';

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
        // Sign Up
        // 1. Check if user already exists
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

        // 2. Insert new user
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
          navigate('/lab/orders');
        }, 1200);

      } else {
        // Log In
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
          navigate('/lab/orders');
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
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#fbfbfb',
      color: '#111111',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'europa', 'Inter', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '0px', // Matches minimalist aesthetic of the store
        padding: '48px 36px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04)',
        border: '1px solid #eaeaea'
      }}>
        
        {/* Logo / Branding */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#111111',
            color: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '16px',
            fontFamily: "'EB Garamond', serif"
          }}>
            L
          </div>
          <h2 style={{ 
            fontSize: '26px', 
            fontWeight: 500, 
            margin: '0 0 8px 0', 
            color: '#111111',
            fontFamily: "'EB Garamond', 'Times New Roman', serif",
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            PIXNXT Lab Portal
          </h2>
          <p style={{ fontSize: '13px', color: '#777777', margin: 0, letterSpacing: '0.02em' }}>
            {isSignUp ? 'REGISTER AN OPERATOR ACCOUNT' : 'SIGN IN TO MANAGE ORDERS'}
          </p>
        </div>

        {/* Form Alerts */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            color: '#c53030',
            padding: '12px 14px',
            borderRadius: '0px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '24px'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f0fff4',
            border: '1px solid #c6f6d5',
            color: '#22543d',
            padding: '12px 14px',
            borderRadius: '0px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '24px'
          }}>
            <CheckCircle size={15} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#111111', 
              textTransform: 'uppercase', 
              marginBottom: '8px', 
              letterSpacing: '0.08em' 
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#777777" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="operator@pixnxt.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '0px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  fontSize: '13.5px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#111111'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#111111', 
              textTransform: 'uppercase', 
              marginBottom: '8px', 
              letterSpacing: '0.08em' 
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#777777" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '0px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  fontSize: '13.5px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#111111'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#111111', 
                textTransform: 'uppercase', 
                marginBottom: '8px', 
                letterSpacing: '0.08em' 
              }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#777777" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    borderRadius: '0px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#111111',
                    fontSize: '13.5px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#111111'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              borderRadius: '0px',
              backgroundColor: '#111111',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
              marginTop: '12px'
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#222222'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#111111'; }}
          >
            {loading ? (
              <span>PROCESSING...</span>
            ) : isSignUp ? (
              <>
                <UserPlus size={15} />
                <span>REGISTER OPERATOR</span>
              </>
            ) : (
              <>
                <LogIn size={15} />
                <span>SIGN IN TO LAB</span>
              </>
            )}
          </button>
        </form>

        {/* Switch Login/Signup */}
        <div style={{
          textAlign: 'center',
          marginTop: '28px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '20px'
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
              color: '#111111',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}
