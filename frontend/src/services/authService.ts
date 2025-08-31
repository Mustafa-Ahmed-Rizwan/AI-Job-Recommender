// frontend/src/services/authService.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

try {
  // This will ensure Firebase is initialized
  import('../config/firebase.js');
} catch (error) {
  console.error('Firebase initialization error:', error);
}


export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLogin: string;
  profileCompleted?: boolean;
  resumeId?: string;
  lastResumeUpdate?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authStateCallbacks: Array<(user: User | null, isNewSignUp?: boolean) => void> = [];
  private isSignUpFlow: boolean = false;

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      // Pass the sign-up flag to callbacks
      this.authStateCallbacks.forEach(callback => callback(user, this.isSignUpFlow));
      // Reset the sign-up flag after notifying callbacks
      if (this.isSignUpFlow) {
        this.isSignUpFlow = false;
      }
    });
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get ID token for API requests
  async getIdToken(): Promise<string | null> {
    if (!this.currentUser) return null;
    try {
      return await this.currentUser.getIdToken(true); // Force refresh token
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }
  // Add this method inside the AuthService class
async refreshAuthToken(): Promise<boolean> {
  if (!this.currentUser) return false;
  
  try {
    await this.currentUser.getIdToken(true);
    return true;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    return false;
  }
}

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    this.isSignUpFlow = false;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login in Firestore with retry logic
    try {
      await this.updateUserProfile(user.uid, { 
        lastLogin: new Date().toISOString() 
      });
    } catch (firestoreError) {
      console.warn('Firestore update failed, but sign-in successful:', firestoreError);
      // Don't fail the sign-in for this
    }
    
    return {
      success: true,
      message: 'Signed in successfully',
      user
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return {
      success: false,
      message: this.getAuthErrorMessage(error.code)
    };
  }
}
  // Sign up with email and password
  async signUp(email: string, password: string, displayName?: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      this.isSignUpFlow = true;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profileCompleted: false
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Sign out the user immediately after sign-up
      await signOut(auth);
      
      return {
        success: true,
        message: 'Account created successfully. Please sign in to continue.',
        user
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      this.isSignUpFlow = false;
      return {
        success: false,
        message: this.getAuthErrorMessage(error.code)
      };
    }
  }

  // Sign out
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      this.isSignUpFlow = false;
      await signOut(auth);
      return {
        success: true,
        message: 'Signed out successfully'
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Error signing out'
      };
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid?: string): Promise<UserProfile | null> {
    try {
      const userId = uid || this.currentUser?.uid;
      if (!userId) return null;
      
      const docRef = doc(db, 'users', userId);
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
      await setDoc(docRef, updates, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // Mark profile as completed
  async markProfileCompleted(resumeId: string): Promise<boolean> {
    if (!this.currentUser) return false;
    
    try {
      const updates: Partial<UserProfile> = {
        profileCompleted: true,
        resumeId: resumeId,
        lastResumeUpdate: new Date().toISOString()
      };
      
      return await this.updateUserProfile(this.currentUser.uid, updates);
    } catch (error) {
      console.error('Error marking profile as completed:', error);
      return false;
    }
  }

  // Check if profile is completed
  async checkProfileCompletion(): Promise<boolean> {
    if (!this.currentUser) return false;
    
    try {
      const profile = await this.getUserProfile(this.currentUser.uid);
      return profile?.profileCompleted || false;
    } catch (error) {
      console.error('Error checking profile completion:', error);
      return false;
    }
  }

  // Remove resume from profile
async removeResumeFromProfile(): Promise<boolean> {
  if (!this.currentUser) return false;
  
  try {
    const docRef = doc(db, 'users', this.currentUser.uid);
    const updates = {
      profileCompleted: false,
      resumeId: deleteField(),
      lastResumeUpdate: new Date().toISOString()
    };
    
    await setDoc(docRef, updates, { merge: true });
    return true;
  } catch (error) {
    console.error('Error removing resume from profile:', error);
    return false;
  }
}

  // Add auth state change listener
  onAuthStateChange(callback: (user: User | null, isNewSignUp?: boolean) => void): () => void {
    this.authStateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  // Get detailed user info including profile status
  async getDetailedUserInfo(): Promise<{
    user: User | null;
    profile: UserProfile | null;
    profileCompleted: boolean;
  }> {
    if (!this.currentUser) {
      return {
        user: null,
        profile: null,
        profileCompleted: false
      };
    }
    
    try {
      const profile = await this.getUserProfile(this.currentUser.uid);
      return {
        user: this.currentUser,
        profile,
        profileCompleted: profile?.profileCompleted || false
      };
    } catch (error) {
      console.error('Error getting detailed user info:', error);
      return {
        user: this.currentUser,
        profile: null,
        profileCompleted: false
      };
    }
  }

  // Validate user session
  async validateSession(): Promise<boolean> {
    if (!this.currentUser) return false;
    
    try {
      // Try to get a fresh token to validate session
      const token = await this.getIdToken();
      return token !== null;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  // Get auth error message
  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
      return 'No account found with this email address.';
      case 'auth/wrong-password':
      return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
      return 'Please enter a valid email address.';
      case 'auth/missing-password':
      return 'Please enter your password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled.';
        case 'auth/invalid-credential':
      return 'Invalid email or password.';
      default:
        console.log('Unknown auth error:', errorCode);
        return 'An error occurred. Please try again.';
    }
  }
}

export const authService = new AuthService();
export default authService;