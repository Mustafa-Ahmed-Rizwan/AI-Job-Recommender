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

// API response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Token expired or invalid, force logout
      authService.logout();
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Add auth header to requests
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

    const config = await this.addAuthHeader({
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const response = await api.post('/upload-resume', formData, config);
    return response.data;
  },

  // Search jobs (requires auth)
  async searchJobs(job_query: string, location: string = 'Pakistan', num_jobs: number = 20): Promise<{
    jobs: Job[];
    total_count: number;
    query_id: string;
  }> {
    const config = await this.addAuthHeader();
    
    const response = await api.post('/search-jobs', {
      job_query,
      location,
      num_jobs,
    }, config);

    return response.data;
  },
  
  // Get cities (no auth required)
  async getCities(country: string): Promise<{ cities: string[]; country: string }> {
    const response = await api.get(`/cities/${country}`);
    return response.data;
  },
  
  // Get job suggestions (no auth required for now, but can be changed)
  async getSuggestedJobs(resume_info: ResumeInfo): Promise<{ suggestions: string[]; message: string }> {
    const config = await this.addAuthHeader();
    
    const response = await api.post('/suggest-jobs', {
      resume_info,
    }, config);
    return response.data;
  },

  // Get similar jobs (requires auth)
  async getSimilarJobs(resume_id: string, query_id: string, top_k: number = 10): Promise<{
    similar_jobs: Job[];
    total_count: number;
    message: string;
  }> {
    const config = await this.addAuthHeader();
    
    const response = await api.get(`/similar-jobs/${resume_id}`, {
      ...config,
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
    const config = await this.addAuthHeader();
    
    const response = await api.post('/analyze-skills', {
      resume_id,
      jobs,
    }, config);

    return response.data;
  },

  // Generate report (no auth required for now, but data should be from authenticated session)
  async generateReport(analyses: JobAnalysis[]): Promise<{
    report: OverallReport;
    message: string;
  }> {
    const config = await this.addAuthHeader();
    
    const response = await api.post('/generate-report', {
      analyses,
    }, config);

    return response.data;
  },

  // Get user profile (requires auth)
  async getUserProfile(): Promise<{
    success: boolean;
    profile?: any;
    message?: string;
  }> {
    const config = await this.addAuthHeader();
    
    const response = await api.get('/user/profile', config);
    return response.data;
  },

  // Update user profile (requires auth)
  async updateUserProfile(profileData: any): Promise<{
    success: boolean;
    message: string;
  }> {
    const config = await this.addAuthHeader();
    
    const response = await api.post('/user/profile', profileData, config);
    return response.data;
  },

  // Session management endpoints (for compatibility, but not needed with Firebase)
  async getSessionData(user_id: string): Promise<any> {
    const config = await this.addAuthHeader();
    const response = await api.get(`/session/${user_id}`, config);
    return response.data;
  },

  async clearSession(user_id: string): Promise<any> {
    const config = await this.addAuthHeader();
    const response = await api.delete(`/session/${user_id}`, config);
    return response.data;
  },

  // Background analysis (requires auth)
  async analyzeSkillsAsync(resume_id: string, jobs: Job[] = []): Promise<{
    task_id: string;
    message: string;
    status: string;
  }> {
    const config = await this.addAuthHeader();
    
    const response = await api.post(`/analyze-skills-async/${resume_id}`, jobs, config);
    return response.data;
  },
};

export default apiService;