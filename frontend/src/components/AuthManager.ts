import { authService } from '../services/authService';
import { showToast, showTab } from './UIHelpers';
import { appState } from './AppState';
import { checkFirstTimeUser } from './ProfileManager';

export const showAuthForms = () => {
  // Hide loading screen first
  document.getElementById('app-loading')?.classList.add('hidden');
  
  const authSection = document.getElementById('auth-section');
  const mainApp = document.getElementById('main-app');
  const viewProfileBtn = document.getElementById('view-profile-btn');
  
  // Show auth section properly
  if (authSection) {
    authSection.classList.remove('hidden');
    authSection.style.display = 'flex';
  }
  
  // Hide main app
  if (mainApp) {
    mainApp.classList.add('hidden');
    mainApp.style.display = 'none';
  }
  
  // Hide profile button
  if (viewProfileBtn) {
    viewProfileBtn.style.display = 'none';
  }
  
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
  // Hide loading screen first
  document.getElementById('app-loading')?.classList.add('hidden');
  
  const authSection = document.getElementById('auth-section');
  const mainApp = document.getElementById('main-app');
  const viewProfileBtn = document.getElementById('view-profile-btn');
  
  // Hide auth section
  if (authSection) {
    authSection.classList.add('hidden');
    authSection.style.display = 'none';
  }
  
  // Show main app
  if (mainApp) {
    mainApp.classList.remove('hidden');
    mainApp.style.display = 'block';
  }
  
  // Show profile button
  if (viewProfileBtn) {
    viewProfileBtn.style.display = 'block';
  }
  
  const user = authService.getCurrentUser();
  const userInfo = document.getElementById('user-info');
  if (user && userInfo) {
    userInfo.textContent = `Welcome, ${user.email}`;
  }
  
  // Show the search tab by default
  showTab('search');
  
  // Add a small delay to allow Firebase to sync
  setTimeout(async () => {
    await checkFirstTimeUser();
  }, 1000);
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
      // Don't call showMainApp here - let the auth state change handler do it
    } else {
      showToast(result.message, 'error');
      authLoading?.classList.add('hidden');
      signinForm?.classList.remove('hidden');
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    // Enhanced error handling with proper Firebase error codes
    let errorMessage = 'Sign in failed. Please try again.';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = `Authentication error: ${error.message}`;
      }
    }
    
    showToast(errorMessage, 'error');
    authLoading?.classList.add('hidden');
    signinForm?.classList.remove('hidden');
  }
};

export const handleSignUp = async (e: Event) => {
  e.preventDefault();
  
  const email = (document.getElementById('signup-email') as HTMLInputElement).value;
  const password = (document.getElementById('signup-password') as HTMLInputElement).value;
  const displayName = (document.getElementById('signup-name') as HTMLInputElement).value;
  
  if (!email || !password) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return;
  }
  
  const authLoading = document.getElementById('auth-loading');
  const signupForm = document.getElementById('signup-form');
  
  try {
    authLoading?.classList.remove('hidden');
    signupForm?.classList.add('hidden');
    
    const result = await authService.signUp(email, password, displayName);
    
    if (result.success) {
      showToast('Account created successfully! Please sign in to continue.', 'success');
      setTimeout(() => {
        authLoading?.classList.add('hidden');
        showSignInForm();
      }, 1000);
    } else {
      showToast(result.message, 'error');
      authLoading?.classList.add('hidden');
      signupForm?.classList.remove('hidden');
    }
  } catch (error: any) {
    console.error('Sign up error:', error);
    
    let errorMessage = 'Sign up failed. Please try again.';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled.';
          break;
        default:
          errorMessage = `Sign up error: ${error.message}`;
      }
    }
    
    showToast(errorMessage, 'error');
    authLoading?.classList.add('hidden');
    signupForm?.classList.remove('hidden');
  }
};

export const handleLogout = async () => {
  try {
    const result = await authService.logout();
    if (result.success) {
      const userInfo = document.getElementById('user-info');
      if (userInfo) {
        userInfo.textContent = '';
      }
      
      showToast('Signed out successfully!');
      clearAllAuthForms();
      resetApplication();
      showAuthForms();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error: any) {
    console.error('Logout error:', error);
    showToast('Logout failed. Please try again.', 'error');
  }
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
};