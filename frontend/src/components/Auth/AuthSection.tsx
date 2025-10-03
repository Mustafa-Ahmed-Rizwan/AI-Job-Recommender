import React, { useState } from 'react';
import { User } from 'lucide-react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

interface AuthSectionProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, displayName: string) => Promise<void>;
}

export const AuthSection: React.FC<AuthSectionProps> = ({ onSignIn, onSignUp }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await onSignIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      await onSignUp(email, password, displayName);
      setIsSignUp(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome to AI Job Recommender</h2>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Sign in to get personalized job recommendations
          </p>
        </div>

        {isSignUp ? (
          <SignUpForm
            onSubmit={handleSignUp}
            onSwitchToSignIn={() => setIsSignUp(false)}
            isLoading={isLoading}
          />
        ) : (
          <SignInForm
            onSubmit={handleSignIn}
            onSwitchToSignUp={() => setIsSignUp(true)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};