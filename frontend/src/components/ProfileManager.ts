import { apiService } from '../utils/api';
import { authService } from '../services/authService';
import { resumeService } from '../services/resumeService';
import { showToast, showTab } from './UIHelpers';
import { appState } from './AppState';
import type { ResumeInfo } from '../types';

export const showProfileCompletionModal = () => {
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
  
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB.', 'error');
    return;
  }
  
  const uploadArea = document.getElementById('modal-upload-area');
  const uploadProgress = document.getElementById('modal-upload-progress');
  
  if (!uploadArea || !uploadProgress) return;
  
  try {
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar') as HTMLElement;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);
    
    const result = await apiService.uploadResume(file);
    
    const saveResult = await resumeService.saveResume(result.resume_info, file.name);
    if (!saveResult.success) {
      console.warn('Failed to save to Firebase:', saveResult.message);
    }
    
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    appState.resumeInfo = result.resume_info;
    appState.resumeId = result.resume_id;
    appState.profileCompleted = true;
    updateSuggestionsUI();
    
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

export const closeProfileCompletionModal = () => {
  const modal = document.getElementById('profile-completion-modal');
  modal?.remove();
};

export const skipProfileCompletion = () => {
  closeProfileCompletionModal();
  showTab('search');
  showToast('You can complete your profile later by clicking "View Profile"', 'warning');
};

export const showProfilePage = async () => {
  const modal = document.getElementById('profile-page-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  await loadProfilePageData();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const loadProfilePageData = async () => {
  const user = authService.getCurrentUser();
  const userProfile = await authService.getUserProfile();
  
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
  
  const filename = document.getElementById('resume-filename');
  const uploadDate = document.getElementById('resume-upload-date');
  
  if (filename) filename.textContent = resumeRecord.filename;
  if (uploadDate) {
    uploadDate.textContent = `Uploaded on ${new Date(resumeRecord.uploadedAt).toLocaleDateString()}`;
  }
  
  window.currentResumeData = resumeRecord.resumeInfo;
};

const showNoResumeState = () => {
  document.getElementById('resume-display')?.classList.add('hidden');
  document.getElementById('no-resume-state')?.classList.remove('hidden');
};

export const toggleResumeDetails = () => {
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
  
  const modalSummary = document.getElementById('modal-summary');
  if (modalSummary) {
    modalSummary.textContent = resumeInfo.summary || 'No summary available';
  }
  
  const modalSkills = document.getElementById('modal-skills');
  if (modalSkills && resumeInfo.extracted_skills) {
    modalSkills.innerHTML = resumeInfo.extracted_skills
    .map((skill: string) => `<span class="skill-tag">${skill}</span>`)
    .join('');
  }
  
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

export const closeProfilePage = () => {
  document.getElementById('profile-page-modal')?.classList.add('hidden');
};

export const showFileUploadModal = () => {
  const modal = document.getElementById('file-upload-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  setupUploadModalHandlers();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

export const closeFileUploadModal = () => {
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
  
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB.', 'error');
    return;
  }
  
  const uploadArea = document.getElementById('upload-modal-area');
  const uploadProgress = document.getElementById('upload-modal-progress');
  
  if (!uploadArea || !uploadProgress) return;
  
  try {
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar') as HTMLElement;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);
    
    const result = await apiService.uploadResume(file);
    
    const saveResult = await resumeService.replaceResume(result.resume_info, file.name);
    if (!saveResult.success) {
      console.warn('Failed to save to Firebase:', saveResult.message);
    }
    
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    appState.resumeInfo = result.resume_info;
    appState.resumeId = result.resume_id;
    appState.profileCompleted = true;
    
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

export const deleteResumeFromProfile = async () => {
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
      appState.profileCompleted = false;
      appState.resumeInfo = null;
      appState.resumeId = null;
      
      showNoResumeState();
      showToast('Resume deleted successfully!');
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Error deleting resume. Please try again.', 'error');
  }
};

export const checkFirstTimeUser = async (retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      showProfileCompletionModal();
      return;
    }

    const userProfile = await authService.getUserProfile();
    const latestResume = await resumeService.getLatestResume();
    
    // Clear previous user's data first
    appState.reset();
    
    // If we get null profile data and haven't retried much, wait and retry
    if (!userProfile && retryCount < maxRetries) {
      setTimeout(() => {
        checkFirstTimeUser(retryCount + 1);
      }, 1500); // Wait 1.5 seconds before retry
      return;
    }
    
    if (!userProfile?.profileCompleted || !latestResume.success || !latestResume.resume) {
      showProfileCompletionModal();
    } else {
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
    if (retryCount < maxRetries) {
      setTimeout(() => {
        checkFirstTimeUser(retryCount + 1);
      }, 1500);
    } else {
      showProfileCompletionModal();
    }
  }
};

export const handleProfileFileUpload = (file: File) => {
  if (!file) return;
  
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Please upload a PDF or DOCX file.', 'error');
    return;
  }
  
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
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar') as HTMLElement;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) progress = 90;
      if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);
    
    const result = await apiService.uploadResume(file);
    
    const saveResult = await resumeService.saveResume(result.resume_info, file.name);
    if (!saveResult.success) {
      console.warn('Failed to save to Firebase:', saveResult.message);
    }
    
    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    
    appState.resumeInfo = result.resume_info;
    appState.resumeId = result.resume_id;
    appState.profileCompleted = true;
    
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
  
  const fileNameElement = document.getElementById('profile-file-name');
  if (fileNameElement) {
    fileNameElement.textContent = fileName;
  }
  
  const summaryElement = document.getElementById('profile-summary');
  if (summaryElement) {
    summaryElement.textContent = resumeInfo.summary || 'No summary available';
  }
  
  const skillsDisplay = document.getElementById('profile-skills-display');
  if (skillsDisplay && resumeInfo.extracted_skills) {
    skillsDisplay.innerHTML = resumeInfo.extracted_skills
      .map((skill: string) => `<span class="skill-tag">${skill}</span>`)
      .join('');
  }
  
  const sections = resumeInfo.sections || {};
  ['experience', 'education', 'projects'].forEach(section => {
    const contentElement = document.getElementById(`profile-${section}-content`);
    if (contentElement) {
      contentElement.textContent = sections[section as keyof typeof sections] || 'Not specified';
    }
  });
  
  const uploadArea = document.getElementById('profile-upload-area');
  const profileCompleted = document.getElementById('profile-completed');
  uploadArea?.classList.add('hidden');
  profileCompleted?.classList.remove('hidden');
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

export const displayExistingResume = (resumeRecord: any) => {
  displayProfileInfo(resumeRecord.resumeInfo, resumeRecord.filename);
  
  const uploadDate = document.getElementById('profile-upload-date');
  if (uploadDate) {
    const date = new Date(resumeRecord.uploadedAt).toLocaleDateString();
    uploadDate.textContent = `Uploaded on ${date}`;
  }
};

export const removeResume = async () => {
  if (!appState.resumeId) return;
  
  if (!confirm('Are you sure you want to remove your resume? You will need to upload a new one to continue using the service.')) {
    return;
  }
  
  try {
    const result = await resumeService.deleteResume(appState.resumeId);
    if (result.success) {
      appState.profileCompleted = false;
      appState.resumeInfo = null;
      appState.resumeId = null;
      
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

export const updateSuggestionsUI = () => {
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