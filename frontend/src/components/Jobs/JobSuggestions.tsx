import React, { useState } from 'react';
import { Lightbulb, Sparkles, Loader, Briefcase } from 'lucide-react';

interface JobSuggestionsProps {
  onGetSuggestions: () => Promise<string[]>;
  onSelectSuggestion: (suggestion: string) => void;
}

export const JobSuggestions: React.FC<JobSuggestionsProps> = ({
  onGetSuggestions,
  onSelectSuggestion,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGetSuggestions = async () => {
    setLoading(true);
    try {
      const result = await onGetSuggestions();
      setSuggestions(result);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span>AI Job Suggestions</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Based on your resume and skills</p>
        </div>
        <button
          onClick={handleGetSuggestions}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>Get Suggestions</span>
        </button>
      </div>

      {loading && (
        <div className="text-center py-6 sm:py-8">
          <Loader className="w-6 h-6 loading-spinner mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">AI is analyzing your profile...</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(suggestion)}
                className="group p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{suggestion}</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-600">
                      Click to search
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Click any suggestion to search for those jobs
          </p>
        </div>
      )}
    </div>
  );
};