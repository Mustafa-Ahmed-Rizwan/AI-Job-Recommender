import { apiService } from '../utils/api';
import { parseMatchPercentage, getMatchLabel, truncateText } from '../utils/helpers';
import { showToast } from './UIHelpers';
import { appState } from './AppState';
import type { JobAnalysis } from '../types';

export const startAnalysis = async () => {
  if (!appState.resumeId || !appState.jobsData.length) {
    showToast('Please complete previous steps first.', 'error');
    return;
  }
  
  const analysisLoading = document.getElementById('analysis-loading');
  const analysisResults = document.getElementById('analysis-results');
  
  try {
    analysisLoading?.classList.remove('hidden');
    analysisResults?.classList.add('hidden');
    
    const progressBar = document.getElementById('analysis-progress');
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 85) progress = 85;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 500);
    
    const jobsToAnalyze = appState.jobsData.slice(0, 5);
    const result = await apiService.analyzeSkills(appState.resumeId, jobsToAnalyze);
    
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    appState.jobAnalyses = result.analyses;
    
    setTimeout(() => {
      analysisLoading?.classList.add('hidden');
      displayAnalysisResults(result.analyses);
      analysisResults?.classList.remove('hidden');
      showToast('Analysis completed successfully!');
    }, 500);
    
  } catch (error: any) {
    analysisLoading?.classList.add('hidden');
    showToast(error.response?.data?.detail || 'Error during analysis. Please try again.', 'error');
  }
};

const displayAnalysisResults = (analyses: JobAnalysis[]) => {
  const analysisTabsContainer = document.getElementById('analysis-tabs');
  const analysisContent = document.getElementById('analysis-content');
  
  if (!analysisTabsContainer || !analysisContent || !analyses.length) return;
  
  const tabs = analyses.map((analysis, index) => {
    const jobTitle = analysis.job_info?.title || `Job ${index + 1}`;
    const truncatedTitle = truncateText(jobTitle, 25);
    return `
      <button onclick="showAnalysisTab(${index})" 
              class="analysis-tab px-4 py-2 text-sm font-medium border-b-2 transition-colors ${index === 0 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              data-tab-index="${index}">
        ${truncatedTitle}
      </button>
    `;
  }).join('');
  
  analysisTabsContainer.innerHTML = tabs;
  showAnalysisTab(0);
};

export const showAnalysisTab = (index: number) => {
  if (!appState.jobAnalyses[index]) return;
  
  const analysis = appState.jobAnalyses[index];
  const analysisContent = document.getElementById('analysis-content');
  
  if (!analysisContent) return;
  
  document.querySelectorAll('.analysis-tab').forEach((tab, i) => {
    if (i === index) {
      tab.className = 'analysis-tab px-4 py-2 text-sm font-medium border-b-2 border-primary-600 text-primary-600 transition-colors';
    } else {
      tab.className = 'analysis-tab px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors';
    }
  });
  
  const jobInfo = analysis.job_info || {};
  const skillGap = analysis.skill_gap_analysis || {};
  const recommendations = analysis.recommendations || {};
  const jobMatch = analysis.job_match_assessment || {};
  
  const matchPercentage = parseMatchPercentage(jobMatch.overall_match_percentage || 0);
  
  analysisContent.innerHTML = `
    <div class="bg-white rounded-xl shadow-soft p-6 space-y-8">
      <!-- Job Header -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-2xl font-bold text-gray-900 mb-2">${jobInfo.title || 'Unknown Position'}</h3>
        <div class="flex items-center space-x-4 text-gray-600">
          <span class="flex items-center space-x-1">
            <i data-lucide="building" class="w-4 h-4"></i>
            <span>${jobInfo.company || 'Unknown Company'}</span>
          </span>
          <span class="flex items-center space-x-1">
            <i data-lucide="map-pin" class="w-4 h-4"></i>
            <span>${jobInfo.location || 'Unknown Location'}</span>
          </span>
        </div>
        
        ${matchPercentage > 0 ? `
          <div class="mt-4">
            <div class="flex items-center space-x-3">
              <span class="text-3xl font-bold ${matchPercentage >= 80 ? 'text-green-600' : matchPercentage >= 60 ? 'text-yellow-600' : 'text-blue-600'}">${matchPercentage}%</span>
              <div>
                <div class="text-lg font-semibold text-gray-900">Overall Match</div>
                <div class="text-sm text-gray-600">${getMatchLabel(matchPercentage / 100)}</div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- Skills Analysis -->
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
            <span>Matching Skills</span>
          </h4>
          <div class="space-y-2">
            ${(skillGap.matching_skills || []).length > 0 ? 
              skillGap.matching_skills.map(skill => `
                <div class="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                  <i data-lucide="check" class="w-4 h-4 text-green-600"></i>
                  <span class="text-sm text-gray-800">${skill}</span>
                </div>
              `).join('') : 
              '<p class="text-sm text-gray-500 italic">No matching skills identified</p>'
            }
          </div>
        </div>
        
        <div>
          <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <i data-lucide="x-circle" class="w-5 h-5 text-red-600"></i>
            <span>Missing Skills</span>
          </h4>
          <div class="space-y-2">
            ${(skillGap.missing_skills || []).length > 0 ? 
              skillGap.missing_skills.map(skill => `
                <div class="flex items-center space-x-2 p-2 bg-red-50 rounded-lg">
                  <i data-lucide="minus" class="w-4 h-4 text-red-600"></i>
                  <span class="text-sm text-gray-800">${skill}</span>
                </div>
              `).join('') : 
              '<p class="text-sm text-gray-500 italic">No missing skills identified</p>'
            }
          </div>
        </div>
      </div>
      
      <!-- Recommendations -->
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <i data-lucide="target" class="w-5 h-5 text-primary-600"></i>
            <span>Priority Skills to Learn</span>
          </h4>
          <div class="space-y-2">
            ${(recommendations.priority_skills_to_learn || []).length > 0 ? 
              recommendations.priority_skills_to_learn.map((skill, idx) => `
                <div class="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg">
                  <div class="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${idx + 1}</div>
                  <span class="text-sm font-medium text-gray-800">${skill}</span>
                </div>
              `).join('') : 
              '<p class="text-sm text-gray-500 italic">No priority skills identified</p>'
            }
          </div>
          
          ${recommendations.timeline_estimate ? `
            <div class="mt-4 p-3 bg-blue-50 rounded-lg">
              <div class="flex items-center space-x-2">
                <i data-lucide="clock" class="w-4 h-4 text-blue-600"></i>
                <span class="text-sm font-medium text-blue-800">Estimated Timeline: ${recommendations.timeline_estimate}</span>
              </div>
            </div>
          ` : ''}
        </div>
        
        <div>
          <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <i data-lucide="trending-up" class="w-5 h-5 text-green-600"></i>
            <span>Your Strengths</span>
          </h4>
          <div class="space-y-2">
            ${(jobMatch.strengths || []).length > 0 ? 
              jobMatch.strengths.map(strength => `
                <div class="flex items-start space-x-2 p-2">
                  <i data-lucide="plus" class="w-4 h-4 text-green-600 mt-0.5"></i>
                  <span class="text-sm text-gray-800">${strength}</span>
                </div>
              `).join('') : 
              '<p class="text-sm text-gray-500 italic">No strengths identified</p>'
            }
          </div>
          
          ${(jobMatch.concerns || []).length > 0 ? `
            <div class="mt-6">
              <h5 class="text-md font-medium text-gray-900 mb-2 flex items-center space-x-2">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-yellow-600"></i>
                <span>Areas for Improvement</span>
              </h5>
              <div class="space-y-2">
                ${jobMatch.concerns.map(concern => `
                  <div class="flex items-start space-x-2 p-2">
                    <i data-lucide="alert-circle" class="w-4 h-4 text-yellow-600 mt-0.5"></i>
                    <span class="text-sm text-gray-800">${concern}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Expandable Sections -->
      <div class="space-y-4">
        ${(recommendations.learning_resources || []).length > 0 ? `
          <details class="bg-gray-50 rounded-lg">
            <summary class="p-4 cursor-pointer font-medium text-gray-900 flex items-center space-x-2">
              <i data-lucide="book-open" class="w-4 h-4"></i>
              <span>Learning Resources</span>
            </summary>
            <div class="px-4 pb-4">
              <ul class="space-y-1">
                ${recommendations.learning_resources.map(resource => `
                  <li class="text-sm text-gray-700 flex items-center space-x-2">
                    <i data-lucide="chevron-right" class="w-3 h-3"></i>
                    <span>${resource}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </details>
          </details>
        ` : ''}
        
        ${(recommendations.project_suggestions || []).length > 0 ? `
          <details class="bg-gray-50 rounded-lg">
            <summary class="p-4 cursor-pointer font-medium text-gray-900 flex items-center space-x-2">
              <i data-lucide="code" class="w-4 h-4"></i>
              <span>Project Suggestions</span>
            </summary>
            <div class="px-4 pb-4">
              <ul class="space-y-1">
                ${recommendations.project_suggestions.map(project => `
                  <li class="text-sm text-gray-700 flex items-center space-x-2">
                    <i data-lucide="chevron-right" class="w-3 h-3"></i>
                    <span>${project}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </details>
        ` : ''}
        
        ${(jobMatch.interview_preparation_tips || []).length > 0 ? `
          <details class="bg-gray-50 rounded-lg">
            <summary class="p-4 cursor-pointer font-medium text-gray-900 flex items-center space-x-2">
              <i data-lucide="user-check" class="w-4 h-4"></i>
              <span>Interview Preparation Tips</span>
            </summary>
            <div class="px-4 pb-4">
              <ul class="space-y-1">
                ${jobMatch.interview_preparation_tips.map(tip => `
                  <li class="text-sm text-gray-700 flex items-center space-x-2">
                    <i data-lucide="chevron-right" class="w-3 h-3"></i>
                    <span>${tip}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </details>
        ` : ''}
      </div>
      
      ${analysis.analysis_error ? `
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-center space-x-2 text-red-800">
            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            <span class="font-medium">Analysis Error:</span>
          </div>
          <p class="text-sm text-red-700 mt-1">${analysis.analysis_error}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};