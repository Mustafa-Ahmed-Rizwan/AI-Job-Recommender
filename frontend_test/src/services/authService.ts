import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types';

class AuthService {
  private currentUser: User | null = null;
  private authStateCallbacks: Array<(user: User | null) => void> = [];
  private isSigningUp = false;

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
    // Ignore auth state changes during sign-up process
    if (this.isSigningUp && user) {
      console.log('Ignoring auth state change during sign-up');
      return;
    }
    
    console.log('Firebase auth state changed:', user ? user.uid : 'No user');
    this.currentUser = user;
    this.authStateCallbacks.forEach(callback => {
      console.log('Calling auth state callback');
      callback(user);
    });
    
    if (user) {
      this.loadUserData(user.uid);
    } else {
      this.clearLocalData();
    }
  });
  }

  // Load user data from backend and store locally
  private async loadUserData(uid: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (userProfile) {
        // Store user profile locally
        await AsyncStorage.setItem('user_profile', JSON.stringify(userProfile));
        
        // Load resume data if available
        if (userProfile.resumeId) {
          await AsyncStorage.setItem('resume_id', userProfile.resumeId);
          
          // Load resume info from backend if available
          if (userProfile.resumeInfo) {
            await AsyncStorage.setItem('resume_info', JSON.stringify(userProfile.resumeInfo));
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  // Clear local data
  private async clearLocalData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'user_profile',
        'resume_id', 
        'resume_info',
        'jobs_data',
        'query_id'
      ]);
      console.log('Local data cleared');
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Check if user has completed profile (uploaded resume)
  async hasCompletedProfile(): Promise<boolean> {
    try {
      // First check if we have a current user
      if (!this.currentUser) {
        console.log('No current user, profile not completed');
        return false;
      }
      
      // Get profile from Firestore (source of truth)
      const userProfile = await this.getUserProfile(this.currentUser.uid);
      console.log('User profile from Firestore:', userProfile);
      
      if (userProfile) {
        // Check if profile is marked as completed AND has resume data
        const hasResume = Boolean(userProfile.resumeId && userProfile.resumeInfo);
        const profileCompleted = userProfile.profileCompleted === true;
        
        console.log('Has resume:', hasResume, 'Profile completed flag:', profileCompleted);
        
        // Update local storage to match backend state
        if (hasResume && profileCompleted && userProfile.resumeId && userProfile.resumeInfo) {
          await AsyncStorage.setItem('resume_id', userProfile.resumeId);
          await AsyncStorage.setItem('resume_info', JSON.stringify(userProfile.resumeInfo));
        }
        
        return hasResume && profileCompleted;
      }
      
      console.log('No user profile found in Firestore');
      return false;
    } catch (error) {
      console.error('Error checking profile completion:', error);
      return false;
    }
  }

  // Get ID token for API requests
  async getIdToken(): Promise<string | null> {
    if (!this.currentUser) return null;
    try {
      return await this.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login
      await this.updateUserProfile(user.uid, { lastLogin: new Date().toISOString() });
      
      return {
        success: true,
        message: 'Signed in successfully',
        user
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.getAuthErrorMessage(error.code)
      };
    }
  }

  // Sign up with email and password - FIXED VERSION
  async signUp(email: string, password: string, displayName?: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    this.isSigningUp = true;
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: displayName || '',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      profileCompleted: false,
      resumeId: null,
      resumeInfo: null
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    await signOut(auth);
    
    // Reset flag after delay
    setTimeout(() => {
      this.isSigningUp = false;
    }, 1000);
    
    return {
      success: true,
      message: 'Account created successfully. Please sign in with your credentials.'
    };
  } catch (error: any) {
    this.isSigningUp = false;
    return {
      success: false,
      message: this.getAuthErrorMessage(error.code)
    };
  }
}

  // Sign out - ENHANCED VERSION
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Starting logout process for user:', this.currentUser?.uid);
      
      // Clear local data first
      await this.clearLocalData();
      console.log('Local data cleared');
      
      // Sign out from Firebase
      await signOut(auth);
      console.log('Firebase signOut completed');
      
      // Reset local state
      this.currentUser = null;
      
      return {
        success: true,
        message: 'Signed out successfully'
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Error signing out: ' + error.message
      };
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        console.log('Retrieved user profile from Firestore:', data);
        return data;
      }
      console.log('No user profile found in Firestore for uid:', uid);
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, updates);
      console.log('User profile updated in Firestore:', updates);
      
      // Update local storage
      const currentProfile = await AsyncStorage.getItem('user_profile');
      if (currentProfile) {
        const updatedProfile = { ...JSON.parse(currentProfile), ...updates };
        await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // Update resume information in user profile - ENHANCED VERSION
  async updateResumeInfo(uid: string, resumeId: string, resumeInfo: any): Promise<boolean> {
    try {
      const updates = {
        resumeId,
        resumeInfo,
        profileCompleted: true, // This is the key flag
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Updating resume info in Firestore:', updates);
      await this.updateUserProfile(uid, updates);
      
      // Store in local storage
      await AsyncStorage.setItem('resume_id', resumeId);
      await AsyncStorage.setItem('resume_info', JSON.stringify(resumeInfo));
      
      // Force trigger auth state callbacks to refresh UI
      this.authStateCallbacks.forEach(callback => callback(this.currentUser));
      
      return true;
    } catch (error) {
      console.error('Error updating resume info:', error);
      return false;
    }
  }

  // Clear resume from user profile
  async clearResumeInfo(uid: string): Promise<boolean> {
    try {
      const updates = {
        resumeId: null,
        resumeInfo: null,
        profileCompleted: false,
        lastUpdated: new Date().toISOString()
      };
      
      await this.updateUserProfile(uid, updates);
      
      // Clear from local storage
      await AsyncStorage.multiRemove(['resume_id', 'resume_info', 'jobs_data', 'query_id']);
      
      return true;
    } catch (error) {
      console.error('Error clearing resume info:', error);
      return false;
    }
  }

  // Add auth state change listener
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  // Get auth error message
  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

export const authService = new AuthService();
export default authService;