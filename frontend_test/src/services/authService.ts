import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types';

class AuthService {
  private currentUser: User | null = null;
  private authStateCallbacks: Array<(user: User | null) => void> = [];

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      console.log('Firebase auth state changed:', user ? user.uid : 'No user'); // Debug log
      this.currentUser = user;
      this.authStateCallbacks.forEach(callback => {
        console.log('Calling auth state callback'); // Debug log
        callback(user);
      });
      
      // Load user data when authenticated
      if (user) {
        this.loadUserData(user.uid);
      } else {
        // Clear local data when signed out
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
  // Replace the hasCompletedProfile method in authService.ts:
async hasCompletedProfile(): Promise<boolean> {
  try {
    // First check if we have a current user
    if (!this.currentUser) return false;
    
    // Get profile from Firestore (source of truth)
    const userProfile = await this.getUserProfile(this.currentUser.uid);
    
    if (userProfile) {
      // Check if profile is marked as completed AND has resume data
      const hasResume = Boolean(userProfile.resumeId && userProfile.resumeInfo);
      const profileCompleted = userProfile.profileCompleted === true;
      
      // Update local storage to match backend state
      if (hasResume && profileCompleted && userProfile.resumeId && userProfile.resumeInfo) {
        await AsyncStorage.setItem('resume_id', userProfile.resumeId);
        await AsyncStorage.setItem('resume_info', JSON.stringify(userProfile.resumeInfo));
      }
      
      return hasResume && profileCompleted;
    }
    
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

  // Sign up with email and password
// In the signUp method, ensure immediate sign out:
async signUp(email: string, password: string, displayName?: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
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
    
    // Immediately sign out to prevent brief app access
    await signOut(auth);
    
    return {
      success: true,
      message: 'Account created successfully. Please sign in.'
    };
  } catch (error: any) {
    return {
      success: false,
      message: this.getAuthErrorMessage(error.code)
    };
  }
}

  // Sign out
 // Sign out
async logout(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Signing out user:', this.currentUser?.uid); // Debug log
    await signOut(auth);
    console.log('Firebase signOut completed'); // Debug log
    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error: any) {
    console.error('Logout error:', error); // Debug log
    return {
      success: false,
      message: 'Error signing out'
    };
  }
}

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
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

  // Update resume information in user profile
  async updateResumeInfo(uid: string, resumeId: string, resumeInfo: any): Promise<boolean> {
    try {
      const updates = {
        resumeId,
        resumeInfo,
        profileCompleted: true,
        lastUpdated: new Date().toISOString()
      };
      
      await this.updateUserProfile(uid, updates);
      
      // Store in local storage
      await AsyncStorage.setItem('resume_id', resumeId);
      await AsyncStorage.setItem('resume_info', JSON.stringify(resumeInfo));
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