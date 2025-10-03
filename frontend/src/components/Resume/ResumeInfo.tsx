import React, { useState } from 'react';
import { Mail, Phone, ChevronDown } from 'lucide-react';
import type { ResumeInfo as ResumeInfoType } from '../../types';

interface ResumeInfoProps {
  resumeInfo: ResumeInfoType;
  onContinue: () => void;
}

export const ResumeInfo: React.FC<ResumeInfoProps> = ({ resumeInfo, onContinue }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Extracted Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {resumeInfo.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{resumeInfo.email}</span>
                </div>
              )}
              {resumeInfo.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{resumeInfo.phone}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
            <div className="text-sm text-gray-600">{resumeInfo.summary || 'No summary available'}</div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Technical Skills</h4>
          <div className="flex flex-wrap gap-2">
            {resumeInfo.extracted_skills?.map((skill, index) => (
              <span key={index} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {['experience', 'education', 'projects'].map((section) => (
            <div key={section}>
              <button
                onClick={() => toggleSection(section)}
                className="w-full text-left p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 capitalize">{section}</h4>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedSections.has(section) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
              {expandedSections.has(section) && (
                <div className="mt-2 p-3 sm:p-4 text-sm text-gray-600 bg-gray-50 rounded-lg">
                  {resumeInfo.sections?.[section as keyof typeof resumeInfo.sections] ||
                    'Not specified'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 sm:mt-8 flex justify-end">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base"
          >
            Continue to Job Search
          </button>
        </div>
      </div>
    </div>
  );
};