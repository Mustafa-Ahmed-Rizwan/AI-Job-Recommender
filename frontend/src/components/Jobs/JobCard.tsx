import React, { useState } from 'react';
import { Building, MapPin, ExternalLink } from 'lucide-react';
import { createReadableJobDescription, smartTruncate } from '../../utils/helpers';
import type { Job } from '../../types';

interface JobCardProps {
  job: Job;
  index: number;
}

export const JobCard: React.FC<JobCardProps> = ({ job, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const similarityScore = parseFloat(String(job.similarity_score || 0));
  const matchPercentage = (similarityScore * 100).toFixed(0);
  
  const matchClass =
    similarityScore > 0.8
      ? 'match-excellent'
      : similarityScore > 0.6
      ? 'match-good'
      : 'match-potential';

  const matchColor =
    similarityScore > 0.8
      ? 'text-green-600'
      : similarityScore > 0.6
      ? 'text-yellow-600'
      : 'text-blue-600';

  const formattedDescription = job.description
    ? createReadableJobDescription(job.description)
    : '';
  const previewDescription = job.description ? smartTruncate(job.description, 180) : '';

  return (
    <div className="job-card">
      <div className="flex flex-col gap-4">
        {/* Job Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {job.title || 'Unknown Title'}
            </h3>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Building className="w-4 h-4" />
                <span>{job.company_name || job.company || 'Unknown Company'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{job.location || 'Unknown Location'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${matchColor}`}>{matchPercentage}%</div>
              <div className="text-xs text-gray-500">Match</div>
            </div>
            <span className={`match-badge ${matchClass}`}>{matchPercentage}% match</span>
          </div>
        </div>

        {/* Job Description */}
        {job.description ? (
          <div className="job-description-container">
            {!isExpanded ? (
              <div className="job-description-preview">{previewDescription}</div>
            ) : (
              <div className="job-description-full job-description">
                <div dangerouslySetInnerHTML={{ __html: formattedDescription }} />
              </div>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="job-description-toggle"
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">No job description available</div>
        )}

        {/* Apply Button */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          {job.apply_link && job.apply_link.startsWith('http') ? (
            <a
              href={job.apply_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Apply Now</span>
            </a>
          ) : (
            <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
              No application link available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};