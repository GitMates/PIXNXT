import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';//just a check

/**
 * Login Form component for authenticating users.
 * @param {Object} props - Component props.
 * @param {function} props.onSuccess - Callback on successful login.
 * @param {function} props.onToggle - Callback to toggle to Signup view.
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          required
        />
      </div>

      {error && <p className="text-xs text-red-500 font-medium" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 px-6 py-2.5 w-full text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        aria-busy={isLoading}
      >
        {isLoading ? 'Signing In...' : 'Log In'}
      </button>

      <p className="mt-2 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <button  type="button" onClick={onToggle} className="text-indigo-600 font-medium hover:underline">
          Sign Up
        </button>
      </p>
    </form>
  );
};
