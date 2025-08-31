import { apiService } from '../utils/api';
import { downloadJSON, downloadCSV, generateCSVReport } from '../utils/helpers';
import { showToast } from './UIHelpers';
import { appState } from './AppState';
import type { OverallReport } from '../types';

export const generateReport = async () => {
  if (!appState.jobAnalyses.length) {
    showToast('Please complete the analysis first.', 'error');
    return;
  }
  
  const reportLoading = document.getElementById('report-loading');
  const reportContent = document.getElementById('report-content');
  
  try {
    reportLoading?.classList.remove('hidden');
    reportContent?.classList.add('hidden');
    
    const result = await apiService.generateReport(appState.jobAnalyses);
    
    appState.overallReport = result.report;
    
    displayReport(result.report);
    
    reportLoading?.classList.add('hidden');
    reportContent?.classList.remove('hidden');
    
    showToast('Report generated successfully!');
    
  } catch (error: any) {
    reportLoading?.classList.add('hidden');
    showToast(error.response?.data?.detail || 'Error generating report. Please try again.', 'error');
  }
};

export const displayReport = (report: OverallReport) => {
  const summaryMetrics = document.getElementById('summary-metrics');
  if (summaryMetrics) {
    const summary = report.summary || {};
    const recommendations = report.recommendations || {};
    
    const readinessLabels = {
      'good': { text: 'Ready', color: 'text-green-600', bg: 'bg-green-100' },
      'needs_improvement': { text: 'Needs Work', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      'significant_gaps': { text: 'Major Gaps', color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    const readiness = recommendations.career_readiness || 'good';
    const readinessStyle = readinessLabels[readiness as keyof typeof readinessLabels] || readinessLabels.good;
    
    summaryMetrics.innerHTML = `
      <div class="text-center">
        <div class="text-3xl font-bold text-gray-900">${summary.total_jobs_analyzed || 0}</div>
        <div class="text-sm text-gray-600">Jobs Analyzed</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-primary-600">${summary.average_match_percentage || '0%'}</div>
        <div class="text-sm text-gray-600">Avg Match</div>
      </div>
      <div class="text-center">
        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${readinessStyle.bg} ${readinessStyle.color}">
          ${readinessStyle.text}
        </div>
        <div class="text-sm text-gray-600 mt-1">Career Readiness</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-red-600">${(summary.most_common_missing_skills || []).length}</div>
        <div class="text-sm text-gray-600">Skills to Learn</div>
      </div>
    `;
  }
  
  const missingSkillsChart = document.getElementById('missing-skills-chart');
  const strongSkillsChart = document.getElementById('strong-skills-chart');
  
  if (missingSkillsChart) {
    const missingSkills = (report.summary?.most_common_missing_skills || []).slice(0, 8);
    missingSkillsChart.innerHTML = missingSkills.length > 0 ? 
      missingSkills.map(skill => `
        <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <span class="text-sm font-medium text-gray-800">${skill}</span>
          <div class="w-16 h-2 bg-red-200 rounded-full">
            <div class="h-2 bg-red-500 rounded-full" style="width: ${Math.random() * 60 + 40}%"></div>
          </div>
        </div>
      `).join('') :
      '<p class="text-sm text-gray-500 italic">No missing skills identified</p>';
  }
  
  if (strongSkillsChart) {
    const strongSkills = (report.summary?.strongest_skills || []).slice(0, 8);
    strongSkillsChart.innerHTML = strongSkills.length > 0 ?
      strongSkills.map(skill => `
        <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <span class="text-sm font-medium text-gray-800">${skill}</span>
          <div class="w-16 h-2 bg-green-200 rounded-full">
            <div class="h-2 bg-green-500 rounded-full" style="width: ${Math.random() * 40 + 60}%"></div>
          </div>
        </div>
      `).join('') :
      '<p class="text-sm text-gray-500 italic">No strong skills identified</p>';
  }
  
  const actionPlan = document.getElementById('action-plan');
  if (actionPlan) {
    const nextSteps = report.recommendations?.next_steps || [];
    actionPlan.innerHTML = nextSteps.length > 0 ?
      nextSteps.map((step, index) => `
        <div class="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
          <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">${index + 1}</div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-800">${step}</p>
          </div>
        </div>
      `).join('') :
      '<p class="text-sm text-gray-500 italic">No action plan available</p>';
  }
  
  const learningPath = document.getElementById('learning-path');
  if (learningPath) {
    const topSkills = report.recommendations?.top_skills_to_develop || [];
    learningPath.innerHTML = topSkills.length > 0 ?
      `<div class="space-y-4">
        ${topSkills.map((skill, index) => `
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-gray-900">${skill}</h4>
              <span class="text-sm text-gray-500">Priority ${index + 1}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div class="bg-primary-600 h-2 rounded-full transition-all duration-300" style="width: 0%" id="skill-progress-${index}"></div>
            </div>
            <div class="flex items-center space-x-2">
              <input type="range" min="0" max="100" value="0" 
                     onchange="updateSkillProgress(${index}, this.value)"
                     class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
              <span class="text-sm text-gray-600" id="skill-percentage-${index}">0%</span>
            </div>
          </div>
        `).join('')}
      </div>` :
      '<p class="text-sm text-gray-500 italic">No learning priorities identified</p>';
  }
};

export const updateSkillProgress = (skillIndex: number, value: string) => {
  const progressBar = document.getElementById(`skill-progress-${skillIndex}`);
  const percentage = document.getElementById(`skill-percentage-${skillIndex}`);
  
  if (progressBar) progressBar.style.width = `${value}%`;
  if (percentage) percentage.textContent = `${value}%`;
};

export const exportReport = (format: 'json' | 'csv') => {
  if (!appState.overallReport) {
    showToast('No report available to export.', 'error');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  if (format === 'json') {
    downloadJSON(appState.overallReport, `job-analysis-report-${timestamp}.json`);
    showToast('Report downloaded as JSON!');
  } else {
    const csvData = generateCSVReport(appState.overallReport);
    downloadCSV(csvData, `job-analysis-summary-${timestamp}.csv`);
    showToast('Report downloaded as CSV!');
  }
};