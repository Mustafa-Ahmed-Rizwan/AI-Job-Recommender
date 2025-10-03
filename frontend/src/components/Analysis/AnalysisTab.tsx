import React, { useState } from 'react';
import { Brain, Loader } from 'lucide-react';
import { AnalysisResults } from './AnalysisResults';
import type { JobAnalysis } from '../../types';

interface AnalysisTabProps {
  onStartAnalysis: () => Promise<void>;
  analyses: JobAnalysis[];
  loading: boolean;
  onContinue: () => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  onStartAnalysis,
  analyses,
  loading,
  onContinue,
}) => {
  const [progress, setProgress] = useState(0);

  const handleStartAnalysis = async () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return 85;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      await onStartAnalysis();
      setProgress(100);
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
          Skill Gap Analysis
        </h2>
        <p className="text-base sm:text-lg text-gray-600">
          AI-powered analysis of your skills vs job requirements
        </p>
      </div>

      {analyses.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 mb-6 sm:mb-8 text-center">
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            Analyze your profile against the top matching jobs to identify skill gaps and
            opportunities.
          </p>
          <button
            onClick={handleStartAnalysis}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center space-x-2 mx-auto text-sm sm:text-base"
          >
            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Start AI Analysis</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-soft p-8 sm:p-12 text-center">
          <Loader className="w-10 h-10 sm:w-12 sm:h-12 loading-spinner mx-auto mb-4 sm:mb-6 text-primary-600" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Analyzing Skills
          </h3>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            AI is comparing your profile with job requirements...
          </p>
          <div className="max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {analyses.length > 0 && !loading && (
        <AnalysisResults analyses={analyses} onContinue={onContinue} />
      )}
    </div>
  );
};