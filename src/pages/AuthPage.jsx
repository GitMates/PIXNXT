import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm, SignupForm } from '../components/features/Auth';
import '../styles/clientGalleryTheme.css';
import './AuthPage.css';

/**
 * AuthPage component that toggles between Login and Signup forms.
 */
const AuthPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');

  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [mode]);

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="auth-page theme-mono cg-shell">
      <div className="auth-page__card">
        <div className="auth-page__header">
          <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="auth-page__logo" />
          <h1 className="auth-page__title">
            {isLogin ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="auth-page__subtitle">
            {isLogin
              ? 'Log in to manage your photography deliveries and galleries.'
              : 'Create an account to start showcasing your best work to the world.'}
          </p>
        </div>

        <div className="auth-page__body">
          {isLogin ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onToggle={() => setIsLogin(false)}
            />
          ) : (
            <SignupForm
              onSuccess={handleAuthSuccess}
              onToggle={() => setIsLogin(true)}
            />
          )}
        </div>

        <div className="auth-page__footer">
          <span className="auth-page__footer-text">Secured by Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
