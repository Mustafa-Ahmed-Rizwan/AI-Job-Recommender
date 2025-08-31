import { authService } from '../services/authService';
import { showToast, showTab } from './UIHelpers';
import { appState } from './AppState';
import { checkFirstTimeUser } from './ProfileManager';

export const showAuthForms = () => {
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('main-app')?.classList.add('hidden');
  document.getElementById('view-profile-btn')?.style.setProperty('display', 'none');
  
  // Clear user info from header
  const userInfo = document.getElementById('user-info');
  if (userInfo) {
    userInfo.textContent = '';
  }
  
  // Hide any loading states
  const authLoading = document.getElementById('auth-loading');
  authLoading?.classList.add('hidden');
  
  showSignInForm();
};

export const showMainApp = async () => {
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('main-app')?.classList.remove('hidden');
  document.getElementById('view-profile-btn')?.style.setProperty('display', 'block');
  
  const user = authService.getCurrentUser();
  const userInfo = document.getElementById('user-info');
  if (user && userInfo) {
    userInfo.textContent = `Welcome, ${user.email}`;
  }
  
  // Add a small delay to allow Firebase to sync
  setTimeout(async () => {
    await checkFirstTimeUser();
  }, 1000); // 1 second delay
};

export const clearAllAuthForms = () => {
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

export const showSignUpForm = () => {
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

export const showSignInForm = () => {
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

export const handleSignIn = async (e: Event) => {
  e.preventDefault();
  
  const email = (document.getElementById('signin-email') as HTMLInputElement).value;
  const password = (document.getElementById('signin-password') as HTMLInputElement).value;
  
  if (!email || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  
  const authLoading = document.getElementById('auth-loading');
  const signinForm = document.getElementById('signin-form');
  
  authLoading?.classList.remove('hidden');
  signinForm?.classList.add('hidden');
  
  try {
    const result = await authService.signIn(email, password);
    
    if (result.success) {
      showToast('Signed in successfully!');
      showMainApp();
    } else {
      // Show error and restore form
      showToast(result.message, 'error');
      authLoading?.classList.add('hidden');
      signinForm?.classList.remove('hidden');
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    showToast('Invalid email or password. Please try again.', 'error');
    authLoading?.classList.add('hidden');
    signinForm?.classList.remove('hidden');
  }
};

export const handleSignUp = async (e: Event) => {
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

export const handleLogout = async () => {
  try {
    const result = await authService.logout();
    if (result.success) {
      // Clear user info immediately
      const userInfo = document.getElementById('user-info');
      if (userInfo) {
        userInfo.textContent = '';
      }
      
      showToast('Signed out successfully!');
      clearAllAuthForms();
      resetApplication();
      showAuthForms(); // This will now clear user info
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Logout failed. Please try again.', 'error');
  }
  // Remove the finally block that was showing loading states
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