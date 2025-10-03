import React from 'react';
import type { TabType } from '../../types';

interface ProgressIndicatorProps {
  currentTab: TabType;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentTab }) => {
  const steps = [
    { id: 'upload', label: 'Find Jobs', number: 1 },
    { id: 'search', label: 'Analysis', number: 2 },
    { id: 'analysis', label: 'Report', number: 3 },
    { id: 'report', label: 'Report', number: 3 },
  ];

  const currentIndex = steps.findIndex(step => step.id === currentTab);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-8 py-3 sm:py-4 overflow-x-auto">
          {steps.slice(0, 3).map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                    index < currentIndex
                      ? 'bg-green-600 text-white'
                      : index === currentIndex
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-xs sm:text-sm step-text ${
                    index < currentIndex
                      ? 'text-green-600'
                      : index === currentIndex
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < 2 && (
                <div className="w-4 sm:w-8 h-0.5 bg-gray-200 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};