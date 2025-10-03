import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
  BookOpen,
  Code,
  UserCheck,
  AlertTriangle,
  Check,
  Minus,
  Plus,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { parseMatchPercentage, getMatchLabel, truncateText } from '../../utils/helpers';
import type { JobAnalysis } from '../../types';

interface AnalysisResultsProps {
  analyses: JobAnalysis[];
  onContinue: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analyses, onContinue }) => {
  const [activeTab, setActiveTab] = useState(0);

  const analysis = analyses[activeTab];
  if (!analysis) return null;

  const jobInfo = analysis.job_info || {};
  const skillGap = analysis.skill_gap_analysis || {};
  const recommendations = analysis.recommendations || {};
  const jobMatch = analysis.job_match_assessment || {};

  const matchPercentage = parseMatchPercentage(jobMatch.overall_match_percentage || 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto pb-2" aria-label="Analysis tabs">
          {analyses.map((_, index) => {
            const title = analyses[index].job_info?.title || `Job ${index + 1}`;
            const truncatedTitle = truncateText(title, 25);
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  index === activeTab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {truncatedTitle}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Analysis Content */}
      <div className="bg-white rounded-xl shadow-soft p-6 space-y-8">
        {/* Job Header */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {jobInfo.title || 'Unknown Position'}
          </h3>
          <div className="flex items-center space-x-4 text-gray-600">
            <span className="flex items-center space-x-1">
              <span>
                {analysis.job_info?.company_name ||
                  analysis.job_info?.company ||
                  jobInfo.company_name ||
                  jobInfo.company ||
                  'Unknown Company'}
              </span>
            </span>
            <span className="flex items-center space-x-1">
              <span>{jobInfo.location || 'Unknown Location'}</span>
            </span>
          </div>

          {matchPercentage > 0 && (
            <div className="mt-4">
              <div className="flex items-center space-x-3">
                <span
                  className={`text-3xl font-bold ${
                    matchPercentage >= 80
                      ? 'text-green-600'
                      : matchPercentage >= 60
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                  }`}
                >
                  {matchPercentage}%
                </span>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Overall Match</div>
                  <div className="text-sm text-gray-600">
                    {getMatchLabel(matchPercentage / 100)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Skills Analysis */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Matching Skills</span>
            </h4>
            <div className="space-y-2">
              {(skillGap.matching_skills || []).length > 0 ? (
                skillGap.matching_skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-800">{skill}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No matching skills identified</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Missing Skills</span>
            </h4>
            <div className="space-y-2">
              {(skillGap.missing_skills || []).length > 0 ? (
                skillGap.missing_skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-2 bg-red-50 rounded-lg">
                    <Minus className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-gray-800">{skill}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No missing skills identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary-600" />
              <span>Priority Skills to Learn</span>
            </h4>
            <div className="space-y-2">
              {(recommendations.priority_skills_to_learn || []).length > 0 ? (
                recommendations.priority_skills_to_learn.map((skill, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg">
                    <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{skill}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No priority skills identified</p>
              )}
            </div>

            {recommendations.timeline_estimate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Estimated Timeline: {recommendations.timeline_estimate}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>Your Strengths</span>
            </h4>
            <div className="space-y-2">
              {(jobMatch.strengths || []).length > 0 ? (
                jobMatch.strengths.map((strength, idx) => (
                  <div key={idx} className="flex items-start space-x-2 p-2">
                    <Plus className="w-4 h-4 text-green-600 mt-0.5" />
                    <span className="text-sm text-gray-800">{strength}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No strengths identified</p>
              )}
            </div>

            {(jobMatch.concerns || []).length > 0 && (
              <div className="mt-6">
                <h5 className="text-md font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span>Areas for Improvement</span>
                </h5>
                <div className="space-y-2">
                  {jobMatch.concerns.map((concern, idx) => (
                    <div key={idx} className="flex items-start space-x-2 p-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <span className="text-sm text-gray-800">{concern}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="space-y-4">
          {(recommendations.learning_resources || []).length > 0 && (
            <details className="bg-gray-50 rounded-lg">
              <summary className="p-4 cursor-pointer font-medium text-gray-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>Learning Resources</span>
              </summary>
              <div className="px-4 pb-4">
                <ul className="space-y-1">
                  {recommendations.learning_resources.map((resource, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center space-x-2">
                      <ChevronRight className="w-3 h-3" />
                      <span>{resource}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {(recommendations.project_suggestions || []).length > 0 && (
            <details className="bg-gray-50 rounded-lg">
              <summary className="p-4 cursor-pointer font-medium text-gray-900 flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>Project Suggestions</span>
              </summary>
              <div className="px-4 pb-4">
                <ul className="space-y-1">
                  {recommendations.project_suggestions.map((project, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center space-x-2">
                      <ChevronRight className="w-3 h-3" />
                      <span>{project}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {(jobMatch.interview_preparation_tips || []).length > 0 && (
            <details className="bg-gray-50 rounded-lg">
              <summary className="p-4 cursor-pointer font-medium text-gray-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Interview Preparation Tips</span>
              </summary>
              <div className="px-4 pb-4">
                <ul className="space-y-1">
                  {jobMatch.interview_preparation_tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center space-x-2">
                      <ChevronRight className="w-3 h-3" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>

        {analysis.analysis_error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Analysis Error:</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{analysis.analysis_error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onContinue}
          className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
};