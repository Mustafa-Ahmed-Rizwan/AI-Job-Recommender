import { apiService } from '../utils/api';
import { 
  getMatchLabel, 
  parseMatchPercentage,
  createReadableJobDescription,
  smartTruncate,
  truncateText
} from '../utils/helpers';
import { showToast } from './UIHelpers';
import { appState } from './AppState';
import type { Job } from '../types';
import { showErrorMessage, showSuccessMessage } from './ErrorManager';
export { showErrorMessage, showSuccessMessage } from './ErrorManager';

export const getSuggestions = async () => {
  // Check if profile is completed first
  if (!appState.profileCompleted || !appState.resumeInfo) {
    showErrorMessage('Please upload your resume first to get AI job suggestions.');
    return;
  }
  
  const suggestionsLoading = document.getElementById('suggestions-loading');
  const suggestionsContent = document.getElementById('suggestions-content');
  const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
  const noProfileSuggestions = document.getElementById('no-profile-suggestions');
  
  try {
    // Disable button and show loading
    if (getSuggestionsBtn) {
      getSuggestionsBtn.setAttribute('disabled', 'true');
      getSuggestionsBtn.classList.add('opacity-50');
    }
    
    noProfileSuggestions?.classList.add('hidden');
    suggestionsLoading?.classList.remove('hidden');
    suggestionsContent?.classList.add('hidden');
    
    // Use resumeInfo directly for suggestions
    const result = await apiService.getSuggestedJobs(appState.resumeInfo);
    
    if (!result?.suggestions?.length) {
      throw new Error('No job suggestions could be generated. Please try again.');
    }
    
    displaySuggestions(result.suggestions);
    
    suggestionsLoading?.classList.add('hidden');
    suggestionsContent?.classList.remove('hidden');
    
    showSuccessMessage('AI job suggestions generated successfully!');
    
  } catch (error: any) {
    console.error('Suggestions error:', error);
    
    suggestionsLoading?.classList.add('hidden');
    noProfileSuggestions?.classList.remove('hidden');
    
    const errorMessage = error.response?.data?.detail || 
                        error.message || 
                        'Unable to generate suggestions. Please check your internet connection and try again.';
    
    showErrorMessage(errorMessage);
  } finally {
    // Re-enable button
    if (getSuggestionsBtn) {
      getSuggestionsBtn.removeAttribute('disabled');
      getSuggestionsBtn.classList.remove('opacity-50');
    }
  }
};

const displaySuggestions = (suggestions: string[]) => {
  const suggestionsGrid = document.getElementById('suggestions-grid');
  if (!suggestionsGrid || !suggestions.length) {
    showToast('No suggestions to display.', 'warning');
    return;
  }
  
  suggestionsGrid.innerHTML = suggestions.map(suggestion => `
    <button onclick="searchWithSuggestion('${suggestion.replace(/'/g, "\\\'")}')" 
            class="group p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 text-left">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
          <i data-lucide="briefcase" class="w-4 h-4 text-blue-600"></i>
        </div>
        <div>
          <div class="font-medium text-gray-900 text-sm">${suggestion}</div>
          <div class="text-xs text-gray-500 group-hover:text-gray-600">Click to search</div>
        </div>
      </div>
    </button>
  `).join('');
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

export const searchWithSuggestion = (suggestion: string) => {
  const jobQueryInput = document.getElementById('job-query') as HTMLInputElement;
  if (jobQueryInput) {
    jobQueryInput.value = suggestion;
    searchJobs();
  }
};

export const searchJobs = async () => {
  const jobQuery = (document.getElementById('job-query') as HTMLInputElement)?.value?.trim();
  const country = (document.getElementById('country-select') as HTMLSelectElement)?.value || 'Pakistan';
  const city = (document.getElementById('city-select') as HTMLSelectElement)?.value;
  const location = city ? `${city}, ${country}` : country;
  const numJobs = parseInt((document.getElementById('num-jobs') as HTMLSelectElement)?.value || '20');
  
  if (!jobQuery) {
    showToast('Please enter a job title or keywords to search.', 'error');
    return;
  }
  
  if (!appState.profileCompleted || !appState.resumeInfo) {
    showToast('Please complete your profile first by uploading a resume.', 'warning');
    return;
  }
  
  const searchLoading = document.getElementById('search-loading');
  const jobResults = document.getElementById('job-results');
  
  try {
    searchLoading?.classList.remove('hidden');
    jobResults?.classList.add('hidden');
    
    const searchResult = await apiService.searchJobs(jobQuery, location, numJobs);
    
    if (!searchResult || !searchResult.jobs || searchResult.jobs.length === 0) {
      showToast('No jobs found. Try different keywords or location.', 'warning');
      searchLoading?.classList.add('hidden');
      return;
    }
    
    if (appState.resumeId) {
      const similarResult = await apiService.getSimilarJobs(
        appState.resumeId,
        searchResult.query_id,
        searchResult.jobs.length
      );
      
      if (!similarResult || !similarResult.similar_jobs || similarResult.similar_jobs.length === 0) {
        showToast('No matching jobs found. Try different keywords.', 'warning');
        searchLoading?.classList.add('hidden');
        return;
      }
      
      appState.jobsData = similarResult.similar_jobs;
      appState.queryId = searchResult.query_id;
      appState.jobsFetched = true;
      
      displayJobs(similarResult.similar_jobs);
      showToast(`Found ${similarResult.similar_jobs.length} matching jobs!`, 'success');
    }
    
    searchLoading?.classList.add('hidden');
    jobResults?.classList.remove('hidden');
    
  } catch (error: any) {
    console.error('Search jobs error:', error);
    
    searchLoading?.classList.add('hidden');
    
    let errorMessage = 'Error searching jobs. Please try again.';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showToast(errorMessage, 'error');
  }
};

export const displayJobs = (jobs: Job[]) => {
  const jobsContainer = document.getElementById('jobs-container');
  const resultsTitle = document.getElementById('results-title');
  
  if (!jobsContainer || !jobs.length) {
    showToast('No jobs to display.', 'warning');
    return;
  }
  
  if (resultsTitle) {
    resultsTitle.textContent = `Found ${jobs.length} Matching Jobs`;
  }
  
  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = parseFloat(String(a.similarity_score || 0));
    const scoreB = parseFloat(String(b.similarity_score || 0));
    return scoreB - scoreA;
  });
  
  jobsContainer.innerHTML = sortedJobs.slice(0, 10).map((job, index) => {
    const similarityScore = parseFloat(String(job.similarity_score || 0));
    const matchClass = similarityScore > 0.8 ? 'match-excellent' : 
                      similarityScore > 0.6 ? 'match-good' : 'match-potential';
    const matchLabel = getMatchLabel(similarityScore);
    
    const formattedDescription = job.description ? createReadableJobDescription(job.description) : '';
    const previewDescription = job.description ? smartTruncate(job.description, 180) : '';
    
    // Enhanced company name handling
    const companyName = job.company_name || job.company || 'Unknown Company';
    const location = job.location || 'Unknown Location';
    const title = job.title || 'Unknown Position';
    
    return `
      <div class="job-card">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
              
              <div class="flex items-center space-x-4 text-sm text-gray-600">
                <div class="flex items-center space-x-1">
                  <i data-lucide="building" class="w-4 h-4"></i>
                  <span>${companyName}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <i data-lucide="map-pin" class="w-4 h-4"></i>
                  <span>${location}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-3">
              <div class="text-center">
                <div class="text-2xl font-bold ${similarityScore > 0.8 ? 'text-green-600' : similarityScore > 0.6 ? 'text-yellow-600' : 'text-blue-600'}">
                  ${(similarityScore * 100).toFixed(0)}%
                </div>
                <div class="text-xs text-gray-500">Match</div>
              </div>
              <span class="match-badge ${matchClass}">${(similarityScore * 100).toFixed(0)}% match</span>
            </div>
          </div>
          
          ${job.description ? `
            <div class="job-description-container">
              <div class="job-description-preview" id="job-preview-${index}">
                ${previewDescription}
              </div>
              
              <div class="job-description-full job-description hidden" id="job-full-${index}">
                <div class="job-description">
                  ${formattedDescription}
                </div>            
              </div>
              <button onclick="toggleJobDescription(${index})" 
                      class="job-description-toggle" 
                      id="job-toggle-${index}">
                Read more
              </button>
            </div>
          ` : `
            <div class="text-sm text-gray-500 italic">
              No job description available
            </div>
          `}
          
          <div class="flex justify-end pt-2 border-t border-gray-100">
            ${job.apply_link && job.apply_link.startsWith('http') ? `
              <a href="${job.apply_link}" target="_blank" rel="noopener noreferrer" 
                 class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center space-x-2">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                <span>Apply Now</span>
              </a>
            ` : `
              <div class="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                No application link available
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

export const toggleJobDescription = (jobIndex: number) => {
  const previewElement = document.getElementById(`job-preview-${jobIndex}`);
  const fullElement = document.getElementById(`job-full-${jobIndex}`);
  const toggleButton = document.getElementById(`job-toggle-${jobIndex}`);
  
  if (!previewElement || !fullElement || !toggleButton) return;
  
  const isExpanded = !fullElement.classList.contains('hidden');
  
  if (isExpanded) {
    previewElement.classList.remove('hidden');
    fullElement.classList.add('hidden');
    toggleButton.textContent = 'Read more';
  } else {
    previewElement.classList.add('hidden');
    fullElement.classList.remove('hidden');
    toggleButton.textContent = 'Read less';
  }
};

export const sortJobs = (criteria: string) => {
  if (!appState.jobsData.length) {
    showToast('No jobs to sort.', 'warning');
    return;
  }
  
  let sortedJobs = [...appState.jobsData];
  
  // Only sort by match score (similarity_score)
  sortedJobs.sort((a, b) => {
    const scoreA = parseFloat(String(a.similarity_score || 0));
    const scoreB = parseFloat(String(b.similarity_score || 0));
    return scoreB - scoreA;
  });
  
  displayJobs(sortedJobs);
};