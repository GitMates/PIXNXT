import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Signup Form component for new user registration.
 * @param {Object} props - Component props.
 * @param {function} props.onSuccess - Callback on successful signup.
 * @param {function} props.onToggle - Callback to toggle to Login view.
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
        {isLoading ? 'Creating Account...' : 'Sign Up'}
      </button>

      <p className="mt-2 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button type="button" onClick={onToggle} className="text-indigo-600 font-medium hover:underline">
          Log In
        </button>
      </p>
    </form>
  );
};
