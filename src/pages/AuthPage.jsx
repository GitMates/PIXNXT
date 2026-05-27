import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm, SignupForm } from '../components/features/Auth';

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
    // Redirect to dashboard on successful authentication
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafbfc] px-4 font-inter">
      <div className="w-full max-w-[440px] p-10 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-indigo-50 rounded-2xl">
             <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight">
            {isLogin ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="mt-3 text-[17px] text-gray-500 leading-relaxed max-w-[280px] mx-auto">
            {isLogin 
              ? 'Log in to manage your photography collections and galleries.' 
              : 'Create an account to start showcase your best work to the world.'}
          </p>
        </div>

        <div className="transition-all duration-300 ease-in-out">
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

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6">
          <span className="text-[14px] font-medium text-gray-400 uppercase tracking-widest">Secured by Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
