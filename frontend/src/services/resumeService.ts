// frontend/src/services/resumeService.ts
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { authService } from './authService';
import type { ResumeInfo } from '../types';

export interface ResumeRecord {
  id: string;
  userId: string;
  resumeInfo: ResumeInfo;
  filename: string;
  uploadedAt: string;
  lastModified: string;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

class ResumeService {
  private collectionName = 'resumes';

  // Save resume to Firestore (for profile completion)
  async saveResume(resumeInfo: ResumeInfo, filename: string): Promise<{ success: boolean; resumeId?: string; message: string }> {
    const user = authService.getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    try {
      const resumeId = `resume_${user.uid}_${Date.now()}`;
      
      // First, deactivate any existing resumes for this user
      await this.deactivateUserResumes(user.uid);
      
      const resumeRecord: ResumeRecord = {
        id: resumeId,
        userId: user.uid,
        resumeInfo,
        filename,
        uploadedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isActive: true
      };

      await setDoc(doc(db, this.collectionName, resumeId), resumeRecord);

      // Mark profile as completed in auth service
      await authService.markProfileCompleted(resumeId);

      return {
        success: true,
        resumeId,
        message: 'Resume saved and profile completed successfully'
      };
    } catch (error: any) {
      console.error('Error saving resume:', error);
      return {
        success: false,
        message: 'Failed to save resume'
      };
    }
  }

  // Deactivate all existing resumes for a user
  private async deactivateUserResumes(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      const deactivatePromises = querySnapshot.docs.map(doc => 
        setDoc(doc.ref, { isActive: false, lastModified: new Date().toISOString() }, { merge: true })
      );
      
      await Promise.all(deactivatePromises);
    } catch (error) {
      console.error('Error deactivating user resumes:', error);
    }
  }

  // Get resume by ID
  async getResume(resumeId: string): Promise<{ success: boolean; resume?: ResumeRecord; message: string }> {
    const user = authService.getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    try {
      const docRef = doc(db, this.collectionName, resumeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const resumeData = docSnap.data() as ResumeRecord;
        
        // Check if user owns this resume
        if (resumeData.userId !== user.uid) {
          return {
            success: false,
            message: 'Unauthorized access'
          };
        }

        return {
          success: true,
          resume: resumeData,
          message: 'Resume retrieved successfully'
        };
      } else {
        return {
          success: false,
          message: 'Resume not found'
        };
      }
    } catch (error: any) {
      console.error('Error getting resume:', error);
      return {
        success: false,
        message: 'Failed to retrieve resume'
      };
    }
  }

  // Get all resumes for current user
async getUserResumes(): Promise<{ success: boolean; resumes?: ResumeRecord[]; message: string }> {
  const user = authService.getCurrentUser();
  
  if (!user) {
    return {
      success: false,
      message: 'User not authenticated'
    };
  }

  try {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', user.uid),
      orderBy('uploadedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const resumes: ResumeRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const resumeData = doc.data() as ResumeRecord;
      // Filter out deleted resumes in memory instead of in query
      if (!resumeData.isDeleted) {
        resumes.push(resumeData);
      }
    });

    return {
      success: true,
      resumes,
      message: 'Resumes retrieved successfully'
    };
  } catch (error: any) {
    console.error('Error getting user resumes:', error);
    return {
      success: false,
      message: 'Failed to retrieve resumes'
    };
  }
}

  // Get active resume for current user
  // Get active resume for current user
// Get active resume for current user
async getActiveResume(): Promise<{ success: boolean; resume?: ResumeRecord; message: string }> {
  const user = authService.getCurrentUser();
  
  if (!user) {
    return {
      success: false,
      message: 'User not authenticated'
    };
  }

  try {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', user.uid),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        message: 'No active resume found'
      };
    }

    // Filter out deleted resumes and sort by uploadedAt
    const resumes: ResumeRecord[] = [];
    querySnapshot.forEach((doc) => {
      const resumeData = doc.data() as ResumeRecord;
      if (!resumeData.isDeleted) {
        resumes.push(resumeData);
      }
    });

    if (resumes.length === 0) {
      return {
        success: false,
        message: 'No active resume found'
      };
    }

    // Sort by uploadedAt descending and take the first one
    const sortedResumes = resumes.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return {
      success: true,
      resume: sortedResumes[0],
      message: 'Active resume retrieved successfully'
    };
  } catch (error: any) {
    console.error('Error getting active resume:', error);
    return {
      success: false,
      message: 'Failed to retrieve active resume'
    };
  }
}
  // Update resume
  async updateResume(resumeId: string, resumeInfo: ResumeInfo): Promise<{ success: boolean; message: string }> {
    const user = authService.getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    try {
      // First check if resume exists and user owns it
      const existingResume = await this.getResume(resumeId);
      if (!existingResume.success) {
        return existingResume;
      }

      const updates = {
        resumeInfo,
        lastModified: new Date().toISOString()
      };

      await setDoc(doc(db, this.collectionName, resumeId), updates, { merge: true });

      return {
        success: true,
        message: 'Resume updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating resume:', error);
      return {
        success: false,
        message: 'Failed to update resume'
      };
    }
  }

  // Delete resume
  // Delete resume
// Delete resume
async deleteResume(resumeId: string): Promise<{ success: boolean; message: string }> {
  const user = authService.getCurrentUser();
  
  if (!user) {
    return {
      success: false,
      message: 'User not authenticated'
    };
  }

  try {
  // Force refresh the auth token before delete operation
  await authService.refreshAuthToken();
  
  // Instead of deleting, mark as deleted and inactive
  const updates = {
    isActive: false,
    isDeleted: true,
    lastModified: new Date().toISOString(),
    deletedAt: new Date().toISOString()
  };

    await setDoc(doc(db, this.collectionName, resumeId), updates, { merge: true });

    // Update auth service profile status
    await authService.removeResumeFromProfile();

    return {
      success: true,
      message: 'Resume deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting resume:', error);
    return {
      success: false,
      message: 'Failed to delete resume'
    };
  }
}

  // Get latest resume for user (alias for getActiveResume for backward compatibility)
  async getLatestResume(): Promise<{ success: boolean; resume?: ResumeRecord; message: string }> {
    return this.getActiveResume();
  }

  // Check if user has completed profile
  async hasCompletedProfile(): Promise<boolean> {
    const activeResume = await this.getActiveResume();
    return activeResume.success;
  }

  // Replace current resume with new one
  async replaceResume(resumeInfo: ResumeInfo, filename: string): Promise<{ success: boolean; resumeId?: string; message: string }> {
    const user = authService.getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    try {
      // Get current active resume to delete it
      const currentResume = await this.getActiveResume();
      
      // Save new resume (this will automatically deactivate old ones)
      const saveResult = await this.saveResume(resumeInfo, filename);
      
      if (saveResult.success && currentResume.success && currentResume.resume) {
        // Delete the old resume document
        await deleteDoc(doc(db, this.collectionName, currentResume.resume.id));
      }
      
      return saveResult;
      
    } catch (error: any) {
      console.error('Error replacing resume:', error);
      return {
        success: false,
        message: 'Failed to replace resume'
      };
    }
  }
}

export const resumeService = new ResumeService();
export default resumeService;