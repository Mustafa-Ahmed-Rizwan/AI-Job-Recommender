import React from 'react';
import { Target, User, LogOut } from 'lucide-react';

interface HeaderProps {
  userEmail?: string;
  onProfileClick: () => void;
  onLogoutClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userEmail, onProfileClick, onLogoutClick }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Target className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">AI Job Recommender</h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {userEmail && (
              <div className="hidden sm:block text-sm text-gray-600">
                Welcome, {userEmail}
              </div>
            )}
            <button
              onClick={onProfileClick}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={onLogoutClick}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};