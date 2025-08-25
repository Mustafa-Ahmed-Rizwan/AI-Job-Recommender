import axios from 'axios';
import type { ResumeInfo, Job, JobAnalysis, OverallReport } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  },

  // Upload resume
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

  // Search jobs
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

  // Get similar jobs
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

  // Analyze skills
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

  // Generate report
  async generateReport(analyses: JobAnalysis[]): Promise<{
    report: OverallReport;
    message: string;
  }> {
    const response = await api.post('/generate-report', {
      analyses,
    });

    return response.data;
  },
};

export default apiService;