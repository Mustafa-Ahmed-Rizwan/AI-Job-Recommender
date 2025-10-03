import React, { useState } from 'react';
import { Loader } from 'lucide-react';

interface SignUpFormProps {
  onSubmit: (email: string, password: string, displayName: string) => Promise<void>;
  onSwitchToSignIn: () => void;
  isLoading: boolean;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, onSwitchToSignIn, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, displayName);
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
          <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="signup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name (Optional)
          </label>
          <input
            type="text"
            id="signup-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            placeholder="Your full name"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base"
        >
          Create Account
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button onClick={onSwitchToSignIn} className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </button>
        </p>
      </div>
    </>
  );
};