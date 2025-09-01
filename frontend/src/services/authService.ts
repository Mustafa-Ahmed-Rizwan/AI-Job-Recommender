// frontend/src/services/authService.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
}

class AuthService {
  private currentUser: User | null = null;
  private authStateCallbacks: Array<(user: User | null, isNewSignUp?: boolean) => void> = [];
  private isSignUpFlow: boolean = false; // Track if we're in sign-up flow

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
      return await this.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      this.isSignUpFlow = false; // Explicitly set to false for sign-in
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
  async signUp(email: string, password: string, displayName?: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      this.isSignUpFlow = true; // Set flag before creating user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
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
      this.isSignUpFlow = false; // Reset flag on error
      return {
        success: false,
        message: this.getAuthErrorMessage(error.code)
      };
    }
  }

  // Sign out
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      this.isSignUpFlow = false; // Reset flag on logout
      await signOut(auth);
      return {
        success: true,
        message: 'Signed out successfully'
      };
    } catch (error: any) {
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
      await setDoc(docRef, updates, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
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