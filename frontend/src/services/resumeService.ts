// frontend/src/services/resumeService.ts
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import type { ResumeInfo } from '../types/index.js';
import { authService } from './authService.js';

export interface ResumeRecord {
  id: string;
  userId: string;
  resumeInfo: ResumeInfo;
  filename: string;
  uploadedAt: string;
  lastModified: string;
}

class ResumeService {
  private collectionName = 'resumes';

  // Save resume to Firestore
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
      const resumeRecord: ResumeRecord = {
        id: resumeId,
        userId: user.uid,
        resumeInfo,
        filename,
        uploadedAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      await setDoc(doc(db, this.collectionName, resumeId), resumeRecord);

      return {
        success: true,
        resumeId,
        message: 'Resume saved successfully'
      };
    } catch (error: any) {
      console.error('Error saving resume:', error);
      return {
        success: false,
        message: 'Failed to save resume'
      };
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
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const resumes: ResumeRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        resumes.push(doc.data() as ResumeRecord);
      });

      // Sort by upload date (newest first)
      resumes.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

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
  async deleteResume(resumeId: string): Promise<{ success: boolean; message: string }> {
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

      await deleteDoc(doc(db, this.collectionName, resumeId));

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

  // Get latest resume for user
  async getLatestResume(): Promise<{ success: boolean; resume?: ResumeRecord; message: string }> {
    const userResumes = await this.getUserResumes();
    
    if (!userResumes.success || !userResumes.resumes || userResumes.resumes.length === 0) {
      return {
        success: false,
        message: 'No resumes found'
      };
    }

    return {
      success: true,
      resume: userResumes.resumes[0], // Already sorted by newest first
      message: 'Latest resume retrieved successfully'
    };
  }
}

export const resumeService = new ResumeService();
export default resumeService;