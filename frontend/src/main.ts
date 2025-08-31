import './style.css';
import { apiService } from './utils/api';
import type { TabType } from './types';
import { authService } from './services/authService';

// Import all components
import { appState } from './components/AppState';
import { 
  showToast, 
  showTab, 
  updateStepIndicator, 
  toggleSection, 
  printReport 
} from './components/UIHelpers';
import { 
  showAuthForms, 
  showMainApp, 
  showSignUpForm, 
  showSignInForm, 
  handleSignIn, 
  handleSignUp, 
  handleLogout 
} from './components/AuthManager';
import { 
  showProfileCompletionModal,
  closeProfileCompletionModal,
  skipProfileCompletion,
  showProfilePage,
  closeProfilePage,
  showFileUploadModal,
  closeFileUploadModal,
  deleteResumeFromProfile,
  toggleResumeDetails,
  checkFirstTimeUser,
  handleProfileFileUpload,
  displayExistingResume,
  removeResume,
  updateSuggestionsUI
} from './components/ProfileManager';
import { 
  getSuggestions,
  searchWithSuggestion,
  searchJobs,
  displayJobs,
  toggleJobDescription,
  sortJobs
} from './components/JobManager';
import { 
  startAnalysis,
  showAnalysisTab
} from './components/AnalysisManager';
import { 
  generateReport,
  displayReport,
  exportReport
} from './components/ReportManager';
import { checkAPIStatus } from './components/ApiManager';

// Initialize Application
const initializeApp = () => {
  authService.onAuthStateChange((user, isNewSignUp) => {
    if (user && !isNewSignUp) {
      console.log('User signed in:', user.email);
      showMainApp();
    } else if (!user) {
      console.log('User signed out');
      showAuthForms();
    }
  });
  
  checkAPIStatus();
  updateStepIndicator('search');
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  setupEventListeners();
};

const setupEventListeners = () => {
  // Profile page listeners
  document.getElementById('view-profile-btn')?.addEventListener('click', showProfilePage);
  document.getElementById('close-profile-modal')?.addEventListener('click', closeProfilePage);
  document.getElementById('upload-resume-btn')?.addEventListener('click', showFileUploadModal);
  document.getElementById('reupload-resume-btn')?.addEventListener('click', showFileUploadModal);
  document.getElementById('delete-resume-btn')?.addEventListener('click', deleteResumeFromProfile);
  document.getElementById('close-upload-modal')?.addEventListener('click', closeFileUploadModal);

  // Auth form listeners
  document.getElementById('signin-form-element')?.addEventListener('submit', handleSignIn);
  document.getElementById('signup-form-element')?.addEventListener('submit', handleSignUp);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  
  // Profile file upload
  const profileUploadArea = document.getElementById('profile-upload-area');
  const profileResumeInput = document.getElementById('profile-resume-input') as HTMLInputElement;
  
  profileUploadArea?.addEventListener('click', () => profileResumeInput?.click());
  profileUploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    profileUploadArea.classList.add('border-primary-400', 'bg-primary-50');
  });
  profileUploadArea?.addEventListener('dragleave', () => {
    profileUploadArea.classList.remove('border-primary-400', 'bg-primary-50');
  });
  profileUploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    profileUploadArea.classList.remove('border-primary-400', 'bg-primary-50');
    const file = e.dataTransfer?.files[0];
    if (file) handleProfileFileUpload(file);
  });
  
  profileResumeInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleProfileFileUpload(file);
  });
  
  // Country/city selection
  document.getElementById('country-select')?.addEventListener('change', async (e) => {
    const country = (e.target as HTMLSelectElement).value;
    const citySelect = document.getElementById('city-select') as HTMLSelectElement;
    
    try {
      citySelect.disabled = true;
      citySelect.innerHTML = '<option value="">Loading cities...</option>';
      
      const result = await apiService.getCities(country);
      
      citySelect.innerHTML = '<option value="">Select City (Optional)</option>';
      result.cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });
      citySelect.disabled = false;
    } catch (error) {
      citySelect.innerHTML = '<option value="">Error loading cities</option>';
      showToast('Error loading cities', 'error');
    }
  });
  
  // Action buttons
  document.getElementById('get-suggestions-btn')?.addEventListener('click', getSuggestions);
  document.getElementById('continue-to-search')?.addEventListener('click', () => {
    if (appState.profileCompleted) {
      showTab('search');
    } else {
      showToast('Please complete your profile first.', 'warning');
    }
  });
  
  document.getElementById('continue-to-analysis')?.addEventListener('click', () => {
    if (appState.jobsFetched) {
      showTab('analysis');
    } else {
      showToast('Please search for jobs first.', 'warning');
    }
  });
  
  document.getElementById('continue-to-report')?.addEventListener('click', () => {
    if (appState.jobAnalyses.length) {
      showTab('report');
      generateReport();
    } else {
      showToast('Please complete the analysis first.', 'warning');
    }
  });
  
  document.getElementById('search-jobs-btn')?.addEventListener('click', searchJobs);
  document.getElementById('start-analysis-btn')?.addEventListener('click', startAnalysis);
  document.getElementById('remove-resume-btn')?.addEventListener('click', removeResume);
  
  // Sort dropdown
  document.getElementById('sort-jobs')?.addEventListener('change', (e) => {
    const criteria = (e.target as HTMLSelectElement).value;
    sortJobs(criteria);
  });
  
  // Export buttons
  document.getElementById('export-json')?.addEventListener('click', () => exportReport('json'));
  document.getElementById('export-csv')?.addEventListener('click', () => exportReport('csv'));
  document.getElementById('print-report')?.addEventListener('click', printReport);
  
  // Reset button
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to start a new analysis? This will clear all current data.')) {
      resetApplication();
    }
  });
  
  // Enter key for search
  document.getElementById('job-query')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchJobs();
    }
  });
  
  // Tab navigation
  document.getElementById('tab-search-btn')?.addEventListener('click', () => showTab('search'));
  document.getElementById('tab-analysis-btn')?.addEventListener('click', () => {
    if (appState.jobsFetched) {
      showTab('analysis');
    } else {
      showToast('Please search for jobs first.', 'warning');
      return;
    }
  });
  document.getElementById('tab-report-btn')?.addEventListener('click', () => {
    if (appState.jobAnalyses.length) {
      showTab('report');
    } else {
      showToast('Please complete the analysis first.', 'warning');
    }
  });
};

const resetApplication = () => {
  appState.reset();
  showTab('search');
  
  document.getElementById('profile-info')?.classList.add('hidden');
  document.getElementById('profile-completed')?.classList.add('hidden');
  document.getElementById('job-results')?.classList.add('hidden');
  document.getElementById('analysis-results')?.classList.add('hidden');
  document.getElementById('report-content')?.classList.add('hidden');
  
  const uploadArea = document.getElementById('profile-upload-area');
  const uploadProgress = document.getElementById('profile-upload-progress');
  uploadArea?.classList.remove('hidden');
  uploadProgress?.classList.add('hidden');
  
  const jobQueryInput = document.getElementById('job-query') as HTMLInputElement;
  const countrySelect = document.getElementById('country-select') as HTMLSelectElement;
  if (jobQueryInput) jobQueryInput.value = '';
  if (countrySelect) countrySelect.value = 'Pakistan';
  
  showToast('Application reset successfully!');
};

// Make functions globally available for onclick handlers
declare global {
  interface Window {
    toggleSection: typeof toggleSection;
    toggleJobDescription: typeof toggleJobDescription;
    showAnalysisTab: typeof showAnalysisTab;
    searchWithSuggestion: typeof searchWithSuggestion;
    showSignUpForm: typeof showSignUpForm;
    showSignInForm: typeof showSignInForm;
    removeResume: typeof removeResume;
    skipProfileCompletion: typeof skipProfileCompletion;
    toggleResumeDetails: typeof toggleResumeDetails;
    currentResumeData: any;
    lucide: any;
  }
}

window.toggleSection = toggleSection;
window.toggleJobDescription = toggleJobDescription;
window.searchWithSuggestion = searchWithSuggestion;
window.showAnalysisTab = showAnalysisTab;
window.showSignUpForm = showSignUpForm;
window.showSignInForm = showSignInForm;
window.removeResume = removeResume;
window.skipProfileCompletion = skipProfileCompletion;
window.toggleResumeDetails = toggleResumeDetails;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);