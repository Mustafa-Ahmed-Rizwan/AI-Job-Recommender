import React, { useState } from 'react';
import { Loader } from 'lucide-react';

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToSignUp: () => void;
  isLoading: boolean;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSubmit, onSwitchToSignUp, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  if (isLoading) {
    return (
      <div className="text-center">
        <Loader className="w-6 h-6 loading-spinner mx-auto mb-2 text-primary-600" />
        <p className="text-sm text-gray-600">Please wait...</p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="signin-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="signin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            placeholder="Your password"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base"
        >
          Sign In
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignUp} className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </button>
        </p>
      </div>
    </>
  );
};