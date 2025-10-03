import React from 'react';
import { Loader } from 'lucide-react';
import { JobCard } from './JobCard';
import type { Job } from '../../types';

interface JobResultsProps {
  jobs: Job[];
  loading: boolean;
  onContinue: () => void;
}

export const JobResults: React.FC<JobResultsProps> = ({ jobs, loading, onContinue }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6 sm:p-8 text-center">
        <Loader className="w-6 h-6 sm:w-8 sm:h-8 loading-spinner mx-auto mb-4 text-primary-600" />
        <p className="text-gray-600 text-sm sm:text-base">
          Searching for jobs and analyzing matches...
        </p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
          Found {jobs.length} Matching Jobs
        </h3>
      </div>

      <div className="space-y-4">
        {jobs.slice(0, 10).map((job, index) => (
          <JobCard key={index} job={job} index={index} />
        ))}
      </div>

      <div className="mt-6 sm:mt-8 flex justify-center">
        <button
          onClick={onContinue}
          className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base"
        >
          Continue to Analysis
        </button>
      </div>
    </div>
  );
};