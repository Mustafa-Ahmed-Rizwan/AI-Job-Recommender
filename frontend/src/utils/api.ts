// frontend/src/utils/api.ts
import axios from 'axios';
import type { ResumeInfo, Job, JobAnalysis, OverallReport } from '../types';
import { authService } from '../services/authService';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await authService.getIdToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Authentication error, logging out user');
      authService.logout();
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Add auth header to requests (legacy method, now handled by interceptor)
  async addAuthHeader(config: any = {}): Promise<any> {
    const token = await authService.getIdToken();
    if (token) {
      return {
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        }
      };
    }
    return config;
  },

  // Health check (no auth required)
  async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  },

  // Upload resume (requires auth)
  async uploadResume(file: File): Promise<{ resume_id: string; resume_info: ResumeInfo }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Search jobs (requires auth)
  async searchJobs(job_query: string, location: string = 'Pakistan', num_jobs: number = 20): Promise<{
    jobs: Job[];
    total_count: number;
    query_id: string;
  }> {
    const response = await api.post('/search-jobs', {
      job_query,
      location,
      num_jobs,
    });

    return response.data;
  },
  
  // Get cities (no auth required)
  async getCities(country: string): Promise<{ cities: string[]; country: string }> {
    const response = await api.get(`/cities/${country}`);
    return response.data;
  },
  
  // Get job suggestions (requires auth)
  async getSuggestedJobs(resume_info: ResumeInfo): Promise<{ suggestions: string[]; message: string }> {
    const response = await api.post('/suggest-jobs', {
      resume_info,
    });
    return response.data;
  },

  // Get similar jobs (requires auth)
  async getSimilarJobs(resume_id: string, query_id: string, top_k: number = 10): Promise<{
    similar_jobs: Job[];
    total_count: number;
    message: string;
  }> {
    const response = await api.get(`/similar-jobs/${resume_id}`, {
      params: {
        query_id,
        top_k,
      },
    });

    return response.data;
  },

  // Analyze skills (requires auth)
  async analyzeSkills(resume_id: string, jobs: Job[]): Promise<{
    analyses: JobAnalysis[];
    message: string;
  }> {
    const response = await api.post('/analyze-skills', {
      resume_id,
      jobs,
    });

    return response.data;
  },

  // Generate report (requires auth)
  async generateReport(analyses: JobAnalysis[]): Promise<{
    report: OverallReport;
    message: string;
  }> {
    const response = await api.post('/generate-report', {
      analyses,
    });

    return response.data;
  },

  // Get user profile (requires auth)
  async getUserProfile(): Promise<{
    success: boolean;
    profile?: any;
    message?: string;
  }> {
    const response = await api.get('/user/profile');
    return response.data;
  },

  // Update user profile (requires auth)
  async updateUserProfile(profileData: any): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.post('/user/profile', profileData);
    return response.data;
  },

  // Session management endpoints (requires auth)
  async getSessionData(): Promise<any> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const response = await api.get(`/session/${user.uid}`);
    return response.data;
  },

  async clearSession(): Promise<any> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const response = await api.delete(`/session/${user.uid}`);
    return response.data;
  },

  // Background analysis (requires auth)
  async analyzeSkillsAsync(resume_id: string, jobs: Job[] = []): Promise<{
    task_id: string;
    message: string;
    status: string;
  }> {
    const response = await api.post(`/analyze-skills-async/${resume_id}`, jobs);
    return response.data;
  },

  // Get user's resume history (requires auth)
  async getResumeHistory(): Promise<{
    success: boolean;
    resumes?: any[];
    message: string;
  }> {
    const response = await api.get('/user/resumes');
    return response.data;
  },

  // Delete resume (requires auth)
  async deleteResume(resume_id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`/user/resume/${resume_id}`);
    return response.data;
  },
};


export default apiService;