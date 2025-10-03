import React, { useState, useEffect } from 'react';
import { Loader, FileText, Table, Printer } from 'lucide-react';
import { downloadJSON, downloadCSV, generateCSVReport } from '../../utils/helpers';
import type { OverallReport } from '../../types';

interface ReportTabProps {
  onGenerateReport: () => Promise<OverallReport | null>;
  report: OverallReport | null;
  loading: boolean;
}

export const ReportTab: React.FC<ReportTabProps> = ({ onGenerateReport, report, loading }) => {
  const [skillProgress, setSkillProgress] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    if (!loading && !report) {
      onGenerateReport();
    }
  }, []);

  const handleExportJSON = () => {
    if (!report) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadJSON(report, `job-analysis-report-${timestamp}.json`);
  };

  const handleExportCSV = () => {
    if (!report) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const csvData = generateCSVReport(report);
    downloadCSV(csvData, `job-analysis-summary-${timestamp}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  const updateSkillProgress = (skillIndex: number, value: number) => {
    setSkillProgress((prev) => ({ ...prev, [skillIndex]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
            Comprehensive Report
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Complete analysis and actionable recommendations
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-6 sm:p-8 text-center">
          <Loader className="w-6 h-6 sm:w-8 sm:h-8 loading-spinner mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600 text-sm sm:text-base">Generating comprehensive report...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const summary = report.summary || {};
  const recommendations = report.recommendations || {};

  const readinessLabels = {
    good: { text: 'Ready', color: 'text-green-600', bg: 'bg-green-100' },
    needs_improvement: { text: 'Needs Work', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    significant_gaps: { text: 'Major Gaps', color: 'text-red-600', bg: 'bg-red-100' },
  };

  const readiness = recommendations.career_readiness || 'good';
  const readinessStyle =
    readinessLabels[readiness as keyof typeof readinessLabels] || readinessLabels.good;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
          Comprehensive Report
        </h2>
        <p className="text-base sm:text-lg text-gray-600">
          Complete analysis and actionable recommendations
        </p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Summary Metrics */}
        <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {summary.total_jobs_analyzed || 0}
              </div>
              <div className="text-sm text-gray-600">Jobs Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {summary.average_match_percentage || '0%'}
              </div>
              <div className="text-sm text-gray-600">Avg Match</div>
            </div>
            <div className="text-center">
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${readinessStyle.bg} ${readinessStyle.color}`}
              >
                {readinessStyle.text}
              </div>
              <div className="text-sm text-gray-600 mt-1">Career Readiness</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {(summary.most_common_missing_skills || []).length}
              </div>
              <div className="text-sm text-gray-600">Skills to Learn</div>
            </div>
          </div>
        </div>

        {/* Skills Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Skills to Develop
            </h3>
            <div className="space-y-3">
              {(summary.most_common_missing_skills || []).length > 0 ? (
                summary.most_common_missing_skills.slice(0, 8).map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">{skill}</span>
                    <div className="w-16 h-2 bg-red-200 rounded-full">
                      <div
                        className="h-2 bg-red-500 rounded-full"
                        style={{ width: `${Math.random() * 60 + 40}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No missing skills identified</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Your Strengths
            </h3>
            <div className="space-y-3">
              {(summary.strongest_skills || []).length > 0 ? (
                summary.strongest_skills.slice(0, 8).map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">{skill}</span>
                    <div className="w-16 h-2 bg-green-200 rounded-full">
                      <div
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${Math.random() * 40 + 60}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No strong skills identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
            Recommended Action Plan
          </h3>
          <div className="space-y-4">
            {(recommendations.next_steps || []).length > 0 ? (
              recommendations.next_steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{step}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No action plan available</p>
            )}
          </div>
        </div>

        {/* Learning Path */}
        <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
            Priority Learning Areas
          </h3>
          <div className="space-y-4">
            {(recommendations.top_skills_to_develop || []).length > 0 ? (
              recommendations.top_skills_to_develop.map((skill, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{skill}</h4>
                    <span className="text-sm text-gray-500">Priority {index + 1}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${skillProgress[index] || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skillProgress[index] || 0}
                      onChange={(e) => updateSkillProgress(index, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {skillProgress[index] || 0}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No learning priorities identified</p>
            )}
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
            Export Report
          </h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <button
              onClick={handleExportJSON}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Download JSON</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
            >
              <Table className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};