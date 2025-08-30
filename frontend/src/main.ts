// frontend/src/main.ts
import './style.css';
import { apiService } from './utils/api';
import { 
  formatFileSize, 
  getMatchColor, 
  getMatchLabel, 
  parseMatchPercentage,
  downloadJSON,
  downloadCSV,
  generateCSVReport,
  createReadableJobDescription,
  smartTruncate,
  formatJobDescription,
  truncateText
} from './utils/helpers';
import type { ResumeInfo, Job, JobAnalysis, OverallReport, TabType } from './types';
import { authService } from './services/authService';
import { resumeService } from './services/resumeService';

// Global application state
class AppState {
  currentTab: TabType = 'search';
  profileCompleted: boolean = false;
  resumeInfo: ResumeInfo | null = null;
  resumeId: string | null = null;
  jobsFetched: boolean = false;
  jobsData: Job[] = [];
  queryId: string | null = null;
  jobAnalyses: JobAnalysis[] = [];
  overallReport: OverallReport | null = null;

  reset() {
    this.currentTab = 'search';
    this.profileCompleted = false;
    this.resumeInfo = null;
    this.resumeId = null;
    this.jobsFetched = false;
    this.jobsData = [];
    this.queryId = null;
    this.jobAnalyses = [];
    this.overallReport = null;
  }
}
const appState = new AppState();

// Utility functions
const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type} slide-up`;
  
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'alert-triangle';
  const iconColor = type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-yellow-600';
  
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>
      <span class="text-sm font-medium text-gray-900">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-gray-400 hover:text-gray-600">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  
  document.getElementById('toast-container')?.appendChild(toast);
  
  // Initialize lucide icons for the toast
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
};
const showProfileCompletionModal = () => {
  const modal = document.createElement('div');
  modal.id = 'profile-completion-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="user-plus" class="w-8 h-8 text-white"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
        <p class="text-gray-600">Upload your resume to get started with personalized job recommendations</p>
      </div>
      
      <div id="modal-upload-area" class="profile-upload-area">
        <div class="space-y-4">
          <div class="mx-auto w-12 h-12 text-gray-400">
            <i data-lucide="upload" class="w-12 h-12"></i>
          </div>
          <div>
            <p class="text-lg font-medium text-gray-900">Drop your resume here, or <span class="text-primary-600">browse</span></p>
            <p class="text-sm text-gray-500 mt-1">Support for PDF and DOCX files up to 10MB</p>
          </div>
        </div>
        <input type="file" id="modal-resume-input" accept=".pdf,.docx" class="hidden">
      </div>
      
      <div id="modal-upload-progress" class="hidden mt-6">
        <div class="flex items-center space-x-3">
          <div class="w-6 h-6 loading-spinner">
            <i data-lucide="loader" class="w-6 h-6 text-primary-600"></i>
          </div>
          <div class="flex-1">
            <div class="flex justify-between text-sm">
              <span class="text-gray-700">Processing resume...</span>
              <span class="text-gray-500">Please wait</span>
            </div>
            <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div class="bg-primary-600 h-2 rounded-full progress-bar" style="width: 0%"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-6 text-center">
        <button onclick="skipProfileCompletion()" class="text-sm text-gray-500 hover:text-gray-700">
          Skip for now
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup modal upload handlers
  setupModalUploadHandlers();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const setupModalUploadHandlers = () => {
  const modalUploadArea = document.getElementById('modal-upload-area');
  const modalResumeInput = document.getElementById('modal-resume-input') as HTMLInputElement;
  
  modalUploadArea?.addEventListener('click', () => modalResumeInput?.click());
  modalUploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    modalUploadArea.classList.add('border-primary-400', 'bg-primary-50');
  });
  modalUploadArea?.addEventListener('dragleave', () => {
    modalUploadArea.classList.remove('border-primary-400', 'bg-primary-50');
  });
  modalUploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    modalUploadArea.classList.remove('border-primary-400', 'bg-primary-50');
    const file = e.dataTransfer?.files[0];
    if (file) handleModalFileUpload(file);
  });
  
  modalResumeInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleModalFileUpload(file);
  });
};

const handleModalFileUpload = async (file: File) => {
  if (!file) return;
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error');
    return;
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB.', 'error');
    return;
  }
  
  const uploadArea = document.getElementById('modal-upload-area');
  const uploadProgress = document.getElementById('modal-upload-progress');
  
  if (!uploadArea || !uploadProgress) return;
  
  try {
    // Show progress
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    // Animate progress bar
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar') as HTMLElement;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);
    
    // Upload and process file
    const result = await apiService.uploadResume(file);
    
    // Save to Firebase
    const saveResult = await resumeService.saveResume(result.resume_info, file.name);
    if (!saveResult.success) {
      console.warn('Failed to save to Firebase:', saveResult.message);
    }
    
    // Complete progress
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    // Update state
    appState.resumeInfo = result.resume_info;
    appState.resumeId = result.resume_id;
    appState.profileCompleted = true;
    updateSuggestionsUI();
    
    // Close modal and proceed to main app
    setTimeout(() => {
      closeProfileCompletionModal();
      showToast('Profile completed successfully!');
      showTab('search');
    }, 500);
    
  } catch (error: any) {
    uploadProgress.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    showToast(error.response?.data?.detail || 'Error processing resume. Please try again.', 'error');
  }
};

const closeProfileCompletionModal = () => {
  const modal = document.getElementById('profile-completion-modal');
  modal?.remove();
};

const skipProfileCompletion = () => {
  closeProfileCompletionModal();
  showTab('search');
  showToast('You can complete your profile later by clicking "View Profile"', 'warning');
};
const showProfilePage = async () => {
  const modal = document.getElementById('profile-page-modal');
  if (!modal) return;
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Load user profile data
  await loadProfilePageData();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const loadProfilePageData = async () => {
  const user = authService.getCurrentUser();
  const userProfile = await authService.getUserProfile();
  
  // Load basic info
  const basicInfo = document.getElementById('profile-basic-info');
  if (basicInfo && user) {
    basicInfo.innerHTML = `
      <div class="flex items-center space-x-2">
        <i data-lucide="mail" class="w-4 h-4 text-gray-500"></i>
        <span><strong>Email:</strong> ${user.email}</span>
      </div>
      ${userProfile?.displayName ? `
        <div class="flex items-center space-x-2">
          <i data-lucide="user" class="w-4 h-4 text-gray-500"></i>
          <span><strong>Name:</strong> ${userProfile.displayName}</span>
        </div>
      ` : ''}
      <div class="flex items-center space-x-2">
        <i data-lucide="calendar" class="w-4 h-4 text-gray-500"></i>
        <span><strong>Member since:</strong> ${userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Unknown'}</span>
      </div>
    `;
  }
  
  // Load resume data
  const resumeResult = await resumeService.getActiveResume();
  if (resumeResult.success && resumeResult.resume) {
    showResumeInProfile(resumeResult.resume);
  } else {
    showNoResumeState();
  }
};

const showResumeInProfile = (resumeRecord: any) => {
  document.getElementById('no-resume-state')?.classList.add('hidden');
  document.getElementById('resume-display')?.classList.remove('hidden');
  
  // Update file info
  const filename = document.getElementById('resume-filename');
  const uploadDate = document.getElementById('resume-upload-date');
  
  if (filename) filename.textContent = resumeRecord.filename;
  if (uploadDate) {
    uploadDate.textContent = `Uploaded on ${new Date(resumeRecord.uploadedAt).toLocaleDateString()}`;
  }
  
  // Store resume data for details view
  window.currentResumeData = resumeRecord.resumeInfo;
};

const showNoResumeState = () => {
  document.getElementById('resume-display')?.classList.add('hidden');
  document.getElementById('no-resume-state')?.classList.remove('hidden');
};

const toggleResumeDetails = () => {
  const details = document.getElementById('resume-details');
  const toggleText = document.getElementById('resume-toggle-text');
  
  if (!details || !toggleText) return;
  
  const isHidden = details.classList.contains('hidden');
  
  if (isHidden) {
    details.classList.remove('hidden');
    toggleText.textContent = 'Hide Details';
    loadResumeDetails();
  } else {
    details.classList.add('hidden');
    toggleText.textContent = 'View Details';
  }
};

const loadResumeDetails = () => {
  if (!window.currentResumeData) return;
  
  const resumeInfo = window.currentResumeData;
  
  // Contact info
  const modalContactInfo = document.getElementById('modal-contact-info');
  if (modalContactInfo) {
    modalContactInfo.innerHTML = '';
    if (resumeInfo.email) {
      modalContactInfo.innerHTML += `<div class="flex items-center space-x-2"><i data-lucide="mail" class="w-4 h-4"></i><span>${resumeInfo.email}</span></div>`;
    }
    if (resumeInfo.phone) {
      modalContactInfo.innerHTML += `<div class="flex items-center space-x-2"><i data-lucide="phone" class="w-4 h-4"></i><span>${resumeInfo.phone}</span></div>`;
    }
    if (!resumeInfo.email && !resumeInfo.phone) {
      modalContactInfo.innerHTML = '<div class="text-gray-500 italic">No contact information found</div>';
    }
  }
  
  // Summary
  const modalSummary = document.getElementById('modal-summary');
  if (modalSummary) {
    modalSummary.textContent = resumeInfo.summary || 'No summary available';
  }
  
  // Skills
  const modalSkills = document.getElementById('modal-skills');
  if (modalSkills && resumeInfo.extracted_skills) {
    modalSkills.innerHTML = resumeInfo.extracted_skills
    .map((skill: string) => `<span class="skill-tag">${skill}</span>`)
    .join('');
  }
  
  // Sections
  const sections = resumeInfo.sections || {};
  const modalExperience = document.getElementById('modal-experience');
  const modalEducation = document.getElementById('modal-education');
  const modalProjects = document.getElementById('modal-projects');
  
  if (modalExperience) modalExperience.textContent = sections.experience || 'Not specified';
  if (modalEducation) modalEducation.textContent = sections.education || 'Not specified';
  if (modalProjects) modalProjects.textContent = sections.projects || 'Not specified';
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const closeProfilePage = () => {
  document.getElementById('profile-page-modal')?.classList.add('hidden');
};

const showFileUploadModal = () => {
  const modal = document.getElementById('file-upload-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  setupUploadModalHandlers();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const closeFileUploadModal = () => {
  document.getElementById('file-upload-modal')?.classList.add('hidden');
};

const setupUploadModalHandlers = () => {
  const uploadArea = document.getElementById('upload-modal-area');
  const fileInput = document.getElementById('upload-modal-input') as HTMLInputElement;
  
  uploadArea?.addEventListener('click', () => fileInput?.click());
  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-primary-400', 'bg-primary-50');
  });
  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-primary-400', 'bg-primary-50');
  });
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary-400', 'bg-primary-50');
    const file = e.dataTransfer?.files[0];
    if (file) handleUploadModalFile(file);
  });
  
  fileInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleUploadModalFile(file);
  });
};

const handleUploadModalFile = async (file: File) => {
  if (!file) return;
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error');
    return;
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB.', 'error');
    return;
  }
  
  const uploadArea = document.getElementById('upload-modal-area');
  const uploadProgress = document.getElementById('upload-modal-progress');
  
  if (!uploadArea || !uploadProgress) return;
  
  try {
    // Show progress
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    // Animate progress bar
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar') as HTMLElement;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);
    
    // Upload and process file
    const result = await apiService.uploadResume(file);
    
    // Replace existing resume
    const saveResult = await resumeService.replaceResume(result.resume_info, file.name);
    if (!saveResult.success) {
      console.warn('Failed to save to Firebase:', saveResult.message);
    }
    
    // Complete progress
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    // Update state
    appState.resumeInfo = result.resume_info;
    appState.resumeId = result.resume_id;
    appState.profileCompleted = true;
    
    // Close modal and refresh profile page
    setTimeout(() => {
      closeFileUploadModal();
      loadProfilePageData();
      showToast('Resume updated successfully!');
    }, 500);
    
  } catch (error: any) {
    uploadProgress.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    showToast(error.response?.data?.detail || 'Error processing resume. Please try again.', 'error');
  }
};

const deleteResumeFromProfile = async () => {
  if (!appState.resumeId) {
    showToast('No resume to delete.', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delete your resume? You will need to upload a new one to continue using job recommendations.')) {
    return;
  }
  
  try {
    const result = await resumeService.deleteResume(appState.resumeId);
    if (result.success) {
      // Reset state
      appState.profileCompleted = false;
      appState.resumeInfo = null;
      appState.resumeId = null;
      
      // Update profile page display
      showNoResumeState();
      
      showToast('Resume deleted successfully!');
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Error deleting resume. Please try again.', 'error');
  }
};

const updateStepIndicator = (currentStep: TabType) => {
  const steps = ['search', 'analysis', 'report'];
  const currentIndex = steps.indexOf(currentStep);
  
  steps.forEach((step, index) => {
    const stepElement = document.getElementById(`step-${step}`);
    const circle = stepElement?.querySelector('div');
    const text = stepElement?.querySelector('span');
    
    if (stepElement && circle && text) {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium';
      text.className = 'text-sm';
      
      if (index < currentIndex) {
        // Completed step
        circle.className += ' bg-green-600 text-white';
        text.className += ' text-green-600';
      } else if (index === currentIndex) {
        // Current step
        circle.className += ' bg-primary-600 text-white';
        text.className += ' text-primary-600 font-medium';
      } else {
        // Future step
        circle.className += ' bg-gray-200 text-gray-500';
        text.className += ' text-gray-500';
      }
    }
  });
};

const showTab = (tabName: TabType) => {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });
  
  // Show current tab
  document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
  
  // Update tab button states
  document.querySelectorAll('.tab-nav-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}-btn`)?.classList.add('active');
  
  // Update state and step indicator
  appState.currentTab = tabName;
  updateStepIndicator(tabName);
};

// Authentication functions
const showAuthForms = () => {
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('main-app')?.classList.add('hidden');
  document.getElementById('view-profile-btn')?.style.setProperty('display', 'none');
  showSignInForm();
};

const showMainApp = () => {
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('main-app')?.classList.remove('hidden');
  // Show the view profile button
  document.getElementById('view-profile-btn')?.style.setProperty('display', 'block');
  
  // Update user info display
  const user = authService.getCurrentUser();
  const userInfo = document.getElementById('user-info');
  if (user && userInfo) {
    userInfo.textContent = `Welcome, ${user.email}`;
  }
  
  checkFirstTimeUser();
};

const checkFirstTimeUser = async () => {
  try {
    const userProfile = await authService.getUserProfile();
    const latestResume = await resumeService.getLatestResume();
    
    if (!userProfile?.profileCompleted || !latestResume.success || !latestResume.resume) {
      // Show profile completion modal for first-time users
      showProfileCompletionModal();
    } else {
      // Existing user with completed profile
      updateSuggestionsUI();
      appState.profileCompleted = true;
      if (latestResume.resume) {
      appState.resumeInfo = latestResume.resume.resumeInfo;
      appState.resumeId = latestResume.resume.id;
    }
      showTab('search');
    }
  } catch (error) {
    console.error('Error checking first time user:', error);
    showProfileCompletionModal();
  }
};

const checkProfileCompletion = async () => {
  try {
    const latestResume = await resumeService.getLatestResume();
    if (latestResume.success && latestResume.resume) {
      // Profile is completed, load existing resume data
      appState.profileCompleted = true;
      appState.resumeInfo = latestResume.resume.resumeInfo;
      appState.resumeId = latestResume.resume.id;
      
      // Display the resume in profile tab
      displayExistingResume(latestResume.resume);
      
      // Start from search tab
      showTab('search');
    } else {
      // Profile not completed, show profile tab
      appState.profileCompleted = false;
      showTab('profile');
    }
  } catch (error) {
    console.error('Error checking profile completion:', error);
    showTab('profile');
  }
};

// Clear all auth forms
const clearAllAuthForms = () => {
  const signinEmail = document.getElementById('signin-email') as HTMLInputElement;
  const signinPassword = document.getElementById('signin-password') as HTMLInputElement;
  const signupEmail = document.getElementById('signup-email') as HTMLInputElement;
  const signupPassword = document.getElementById('signup-password') as HTMLInputElement;
  const signupName = document.getElementById('signup-name') as HTMLInputElement;
  
  if (signinEmail) signinEmail.value = '';
  if (signinPassword) signinPassword.value = '';
  if (signupEmail) signupEmail.value = '';
  if (signupPassword) signupPassword.value = '';
  if (signupName) signupName.value = '';
};

const showSignUpForm = () => {
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  
  if (signinForm) {
    signinForm.classList.add('hidden');
    signinForm.style.display = 'none';
  }
  
  if (signupForm) {
    signupForm.classList.remove('hidden');
    signupForm.style.display = 'block';
  }
  
  clearAllAuthForms();
  
  setTimeout(() => {
    const emailInput = document.getElementById('signup-email') as HTMLInputElement;
    if (emailInput) {
      emailInput.focus();
    }
  }, 100);
};

const showSignInForm = () => {
  const signupForm = document.getElementById('signup-form');
  const signinForm = document.getElementById('signin-form');
  
  if (signupForm) {
    signupForm.classList.add('hidden');
    signupForm.style.display = 'none';
  }
  
  if (signinForm) {
    signinForm.classList.remove('hidden');
    signinForm.style.display = 'block';
  }
  
  clearAllAuthForms();
  
  setTimeout(() => {
    const emailInput = document.getElementById('signin-email') as HTMLInputElement;
    if (emailInput) {
      emailInput.focus();
    }
  }, 100);
};

const handleSignIn = async (e: Event) => {
  e.preventDefault();
  
  const email = (document.getElementById('signin-email') as HTMLInputElement).value;
  const password = (document.getElementById('signin-password') as HTMLInputElement).value;
  
  const authLoading = document.getElementById('auth-loading');
  const signinForm = document.getElementById('signin-form');
  
  try {
    authLoading?.classList.remove('hidden');
    signinForm?.classList.add('hidden');
    
    const result = await authService.signIn(email, password);
    
    if (result.success) {
      showToast('Signed in successfully!');
      showMainApp();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Sign in failed. Please try again.', 'error');
  } finally {
    authLoading?.classList.add('hidden');
    signinForm?.classList.remove('hidden');
  }
};

const handleSignUp = async (e: Event) => {
  e.preventDefault();
  
  const email = (document.getElementById('signup-email') as HTMLInputElement).value;
  const password = (document.getElementById('signup-password') as HTMLInputElement).value;
  const displayName = (document.getElementById('signup-name') as HTMLInputElement).value;
  
  const authLoading = document.getElementById('auth-loading');
  const signupForm = document.getElementById('signup-form');
  
  try {
    authLoading?.classList.remove('hidden');
    signupForm?.classList.add('hidden');
    
    const result = await authService.signUp(email, password, displayName);
    
    if (result.success) {
      showToast('Account created successfully! Please sign in to continue.');
      setTimeout(() => {
        showSignInForm();
      }, 100);
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Sign up failed. Please try again.', 'error');
  } finally {
    authLoading?.classList.add('hidden');
    signupForm?.classList.remove('hidden');
  }
};

const handleLogout = async () => {
  try {
    const result = await authService.logout();
    if (result.success) {
      showToast('Signed out successfully!');
      clearAllAuthForms();
      showAuthForms();
      resetApplication();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Logout failed. Please try again.', 'error');
  }
};

// Profile Functions
const handleProfileFileUpload = (file: File) => {
  if (!file) return;
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error');
    return;
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB.', 'error');
    return;
  }
  
  uploadResumeToProfile(file);
};

const uploadResumeToProfile = async (file: File) => {
  const uploadArea = document.getElementById('profile-upload-area');
  const uploadProgress = document.getElementById('profile-upload-progress');
  const profileInfo = document.getElementById('profile-info');
  
  if (!uploadArea || !uploadProgress) return;
  
  try {
    // Show progress
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    // Animate progress bar
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar') as HTMLElement;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);
    
    // Upload and process file
    const result = await apiService.uploadResume(file);
    
    // Save to Firebase
    const saveResult = await resumeService.saveResume(result.resume_info, file.name);
    if (!saveResult.success) {
      console.warn('Failed to save to Firebase:', saveResult.message);
    }
    
    // Complete progress
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    // Update state
    appState.resumeInfo = result.resume_info;
    appState.resumeId = result.resume_id;
    appState.profileCompleted = true;
    
    // Hide progress and show result
    setTimeout(() => {
      uploadProgress.classList.add('hidden');
      displayProfileInfo(result.resume_info, file.name);
      profileInfo?.classList.remove('hidden');
      showToast('Profile completed successfully!');
    }, 500);
    
  } catch (error: any) {
    uploadProgress.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    showToast(error.response?.data?.detail || 'Error processing resume. Please try again.', 'error');
  }
};

const displayProfileInfo = (resumeInfo: ResumeInfo, fileName: string) => {
  // Contact info
  const contactInfo = document.getElementById('profile-contact-info');
  if (contactInfo) {
    contactInfo.innerHTML = '';
    if (resumeInfo.email) {
      contactInfo.innerHTML += `<div class="flex items-center space-x-2"><i data-lucide="mail" class="w-4 h-4"></i><span>${resumeInfo.email}</span></div>`;
    }
    if (resumeInfo.phone) {
      contactInfo.innerHTML += `<div class="flex items-center space-x-2"><i data-lucide="phone" class="w-4 h-4"></i><span>${resumeInfo.phone}</span></div>`;
    }
  }
  
  // File name
  const fileNameElement = document.getElementById('profile-file-name');
  if (fileNameElement) {
    fileNameElement.textContent = fileName;
  }
  
  // Summary
  const summaryElement = document.getElementById('profile-summary');
  if (summaryElement) {
    summaryElement.textContent = resumeInfo.summary || 'No summary available';
  }
  
  // Skills
  const skillsDisplay = document.getElementById('profile-skills-display');
  if (skillsDisplay && resumeInfo.extracted_skills) {
    skillsDisplay.innerHTML = resumeInfo.extracted_skills
      .map((skill: string) => `<span class="skill-tag">${skill}</span>`)
      .join('');
  }
  
  // Sections
  const sections = resumeInfo.sections || {};
  ['experience', 'education', 'projects'].forEach(section => {
    const contentElement = document.getElementById(`profile-${section}-content`);
    if (contentElement) {
      contentElement.textContent = sections[section as keyof typeof sections] || 'Not specified';
    }
  });
  
  // Show profile completed state
  const uploadArea = document.getElementById('profile-upload-area');
  const profileCompleted = document.getElementById('profile-completed');
  uploadArea?.classList.add('hidden');
  profileCompleted?.classList.remove('hidden');
  
  // Initialize lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const displayExistingResume = (resumeRecord: any) => {
  displayProfileInfo(resumeRecord.resumeInfo, resumeRecord.filename);
  
  // Update upload date
  const uploadDate = document.getElementById('profile-upload-date');
  if (uploadDate) {
    const date = new Date(resumeRecord.uploadedAt).toLocaleDateString();
    uploadDate.textContent = `Uploaded on ${date}`;
  }
};

const removeResume = async () => {
  if (!appState.resumeId) return;
  
  if (!confirm('Are you sure you want to remove your resume? You will need to upload a new one to continue using the service.')) {
    return;
  }
  
  try {
    const result = await resumeService.deleteResume(appState.resumeId);
    if (result.success) {
      // Reset state
      appState.profileCompleted = false;
      appState.resumeInfo = null;
      appState.resumeId = null;
      
      // Reset UI
      const uploadArea = document.getElementById('profile-upload-area');
      const profileCompleted = document.getElementById('profile-completed');
      const profileInfo = document.getElementById('profile-info');
      
      uploadArea?.classList.remove('hidden');
      profileCompleted?.classList.add('hidden');
      profileInfo?.classList.add('hidden');
      
      showToast('Resume removed successfully!');
      showTab('profile');
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Error removing resume. Please try again.', 'error');
  }
};

// API Status Check
const checkAPIStatus = async () => {
  const statusElement = document.getElementById('api-status');
  if (!statusElement) return;
  
  try {
    const isHealthy = await apiService.checkHealth();
    if (isHealthy) {
      statusElement.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        <span class="text-sm text-gray-600">Backend Connected</span>
      `;
    } else {
      throw new Error('API not responding');
    }
  } catch (error) {
    statusElement.innerHTML = `
      <div class="w-2 h-2 bg-red-500 rounded-full"></div>
      <span class="text-sm text-gray-600">Backend Disconnected</span>
    `;
    showToast('Backend API is not running. Please start the FastAPI server.', 'error');
  }
};

// Job Search Functions
const searchJobs = async () => {
  const jobQuery = (document.getElementById('job-query') as HTMLInputElement)?.value?.trim();
  const country = (document.getElementById('country-select') as HTMLSelectElement)?.value || 'Pakistan';
  const city = (document.getElementById('city-select') as HTMLSelectElement)?.value;
  const location = city ? `${city}, ${country}` : country;
  const numJobs = parseInt((document.getElementById('num-jobs') as HTMLSelectElement)?.value || '20');
  
  if (!jobQuery) {
    showToast('Please enter a job title or keywords.', 'error');
    return;
  }
  
  if (!appState.profileCompleted) {
    showToast('Please complete your profile first.', 'warning');
    return;
  }
  
  const searchLoading = document.getElementById('search-loading');
  const jobResults = document.getElementById('job-results');
  
  try {
    // Show loading
    searchLoading?.classList.remove('hidden');
    jobResults?.classList.add('hidden');
    
    // Search jobs
    const searchResult = await apiService.searchJobs(jobQuery, location, numJobs);
    
    if (!searchResult.jobs || searchResult.jobs.length === 0) {
      showToast('No jobs found. Try different keywords or location.', 'warning');
      searchLoading?.classList.add('hidden');
      return;
    }
    
    // Get similar jobs
    if (appState.resumeId) {
      const similarResult = await apiService.getSimilarJobs(
        appState.resumeId,
        searchResult.query_id,
        searchResult.jobs.length
      );
      
      // Update state
      appState.jobsData = similarResult.similar_jobs;
      appState.queryId = searchResult.query_id;
      appState.jobsFetched = true;
      
      // Display results
      displayJobs(similarResult.similar_jobs);
      showToast(`Found ${similarResult.similar_jobs.length} matching jobs!`);
    }
    
    // Show results
    searchLoading?.classList.add('hidden');
    jobResults?.classList.remove('hidden');
    
  } catch (error: any) {
    searchLoading?.classList.add('hidden');
    showToast(error.response?.data?.detail || 'Error searching jobs. Please try again.', 'error');
  }
};

const displayJobs = (jobs: Job[]) => {
  const jobsContainer = document.getElementById('jobs-container');
  const resultsTitle = document.getElementById('results-title');
  
  if (!jobsContainer || !jobs.length) return;
  
  // Update title
  if (resultsTitle) {
    resultsTitle.textContent = `Found ${jobs.length} Matching Jobs`;
  }
  
  // Sort jobs by similarity score
  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = parseFloat(String(a.similarity_score || 0));
    const scoreB = parseFloat(String(b.similarity_score || 0));
    return scoreB - scoreA;
  });
  
  // Generate job cards
  jobsContainer.innerHTML = sortedJobs.slice(0, 10).map((job, index) => {
    const similarityScore = parseFloat(String(job.similarity_score || 0));
    const matchClass = similarityScore > 0.8 ? 'match-excellent' : 
                      similarityScore > 0.6 ? 'match-good' : 'match-potential';
    const matchLabel = getMatchLabel(similarityScore);
    
    const formattedDescription = job.description ? createReadableJobDescription(job.description) : '';
    const previewDescription = job.description ? smartTruncate(job.description, 180) : '';
    
    return `
      <div class="job-card">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${job.title || 'Unknown Title'}</h3>
              
              <div class="flex items-center space-x-4 text-sm text-gray-600">
                <div class="flex items-center space-x-1">
                  <i data-lucide="building" class="w-4 h-4"></i>
                  <span>${job.company_name || job.company || 'Unknown Company'}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <i data-lucide="map-pin" class="w-4 h-4"></i>
                  <span>${job.location || 'Unknown Location'}</span>
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
  
  // Initialize lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const getSuggestions = async () => {
  if (!appState.resumeInfo) {
    showToast('Please complete your profile first.', 'warning');
    showProfilePage();
    return;
  }
  
  const suggestionsLoading = document.getElementById('suggestions-loading');
  const suggestionsContent = document.getElementById('suggestions-content');
  const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
  const noProfileSuggestions = document.getElementById('no-profile-suggestions');
  
  try {
    getSuggestionsBtn?.setAttribute('disabled', 'true');
    noProfileSuggestions?.classList.add('hidden');
    suggestionsLoading?.classList.remove('hidden');
    suggestionsContent?.classList.add('hidden');
    
    const result = await apiService.getSuggestedJobs(appState.resumeInfo);
    
    displaySuggestions(result.suggestions);
    
    suggestionsLoading?.classList.add('hidden');
    suggestionsContent?.classList.remove('hidden');
    
    showToast('Job suggestions generated!');
    
  } catch (error: any) {
    suggestionsLoading?.classList.add('hidden');
    noProfileSuggestions?.classList.remove('hidden');
    showToast(error.response?.data?.detail || 'Error getting suggestions', 'error');
  } finally {
    getSuggestionsBtn?.removeAttribute('disabled');
  }
};
const updateSuggestionsUI = () => {
  const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
  const noProfileSuggestions = document.getElementById('no-profile-suggestions');
  const suggestionsContent = document.getElementById('suggestions-content');
  
  if (appState.profileCompleted && appState.resumeInfo) {
    getSuggestionsBtn?.removeAttribute('disabled');
    noProfileSuggestions?.classList.add('hidden');
  } else {
    getSuggestionsBtn?.setAttribute('disabled', 'true');
    noProfileSuggestions?.classList.remove('hidden');
    suggestionsContent?.classList.add('hidden');
  }
};

const displaySuggestions = (suggestions: string[]) => {
  const suggestionsGrid = document.getElementById('suggestions-grid');
  if (!suggestionsGrid || !suggestions.length) return;
  
  suggestionsGrid.innerHTML = suggestions.map(suggestion => `
    <button onclick="searchWithSuggestion('${suggestion}')" 
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

const searchWithSuggestion = (suggestion: string) => {
  const jobQueryInput = document.getElementById('job-query') as HTMLInputElement;
  if (jobQueryInput) {
    jobQueryInput.value = suggestion;
    searchJobs();
  }
};

// Analysis Functions
const startAnalysis = async () => {
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
  
  // Show first analysis by default
  showAnalysisTab(0);
};

const showAnalysisTab = (index: number) => {
  if (!appState.jobAnalyses[index]) return;
  
  const analysis = appState.jobAnalyses[index];
  const analysisContent = document.getElementById('analysis-content');
  
  if (!analysisContent) return;
  
  // Update tab active state
  document.querySelectorAll('.analysis-tab').forEach((tab, i) => {
    if (i === index) {
      tab.className = 'analysis-tab px-4 py-2 text-sm font-medium border-b-2 border-primary-600 text-primary-600 transition-colors';
    } else {
      tab.className = 'analysis-tab px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors';
    }
  });
  
  // Display analysis content
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

// Report Functions
const generateReport = async () => {
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

const displayReport = (report: OverallReport) => {
  // Summary metrics
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
  
  // Skills charts
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
  
  // Action plan
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
  
  // Learning path
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

// Event Handlers
const toggleSection = (sectionName: string) => {
  const content = document.getElementById(`${sectionName}-content`);
  const chevron = document.getElementById(`${sectionName}-chevron`);
  
  if (content && chevron) {
    content.classList.toggle('hidden');
    chevron.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
  }
};

const toggleJobDescription = (jobIndex: number) => {
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

const updateSkillProgress = (skillIndex: number, value: string) => {
  const progressBar = document.getElementById(`skill-progress-${skillIndex}`);
  const percentage = document.getElementById(`skill-percentage-${skillIndex}`);
  
  if (progressBar) progressBar.style.width = `${value}%`;
  if (percentage) percentage.textContent = `${value}%`;
};

const sortJobs = (criteria: string) => {
  if (!appState.jobsData.length) return;
  
  let sortedJobs = [...appState.jobsData];
  
  switch (criteria) {
    case 'relevance':
      sortedJobs.sort((a, b) => {
        const scoreA = parseFloat(String(a.similarity_score || 0));
        const scoreB = parseFloat(String(b.similarity_score || 0));
        return scoreB - scoreA;
      });
      break;
    case 'company':
      sortedJobs.sort((a, b) => {
        const companyA = (a.company_name || a.company || '').toLowerCase();
        const companyB = (b.company_name || b.company || '').toLowerCase();
        return companyA.localeCompare(companyB);
      });
      break;
    case 'location':
      sortedJobs.sort((a, b) => {
        const locationA = (a.location || '').toLowerCase();
        const locationB = (b.location || '').toLowerCase();
        return locationA.localeCompare(locationB);
      });
      break;
  }
  
  displayJobs(sortedJobs);
};

// Export functions
const exportReport = (format: 'json' | 'csv') => {
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

const printReport = () => {
  window.print();
};

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
  // Add these to the existing setupEventListeners function:

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
  // Reset state
  appState.reset();
  
  // Reset UI
  showTab('search');
  
  // Clear content
  document.getElementById('profile-info')?.classList.add('hidden');
  document.getElementById('profile-completed')?.classList.add('hidden');
  document.getElementById('job-results')?.classList.add('hidden');
  document.getElementById('analysis-results')?.classList.add('hidden');
  document.getElementById('report-content')?.classList.add('hidden');
  
  // Reset profile upload area
  const uploadArea = document.getElementById('profile-upload-area');
  const uploadProgress = document.getElementById('profile-upload-progress');
  uploadArea?.classList.remove('hidden');
  uploadProgress?.classList.add('hidden');
  
  // Clear form inputs
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
    updateSkillProgress: typeof updateSkillProgress;
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
window.updateSkillProgress = updateSkillProgress;
window.showSignUpForm = showSignUpForm;
window.showSignInForm = showSignInForm;
window.removeResume = removeResume;
window.skipProfileCompletion = skipProfileCompletion;
window.toggleResumeDetails = toggleResumeDetails;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);