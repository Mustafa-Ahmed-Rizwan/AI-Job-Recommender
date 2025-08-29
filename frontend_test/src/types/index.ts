// Same types as your web app
export interface ResumeInfo {
  raw_text: string;
  email?: string;
  phone?: string;
  sections: {
    education: string;
    experience: string;
    skills: string;
    projects: string;
  };
  extracted_skills: string[];
  summary: string;
}

export interface Job {
  title: string;
  company_name: string;
  company?: string;
  location: string;
  description: string;
  apply_link?: string;
  similarity_score?: number;
  job_id?: string;
}

export interface SkillGapAnalysis {
  matching_skills: string[];
  missing_skills: string[];
  skill_level_gaps: string[];
  transferable_skills: string[];
}

export interface Recommendations {
  priority_skills_to_learn: string[];
  learning_resources: string[];
  project_suggestions: string[];
  timeline_estimate: string;
}

export interface JobMatchAssessment {
  overall_match_percentage: string | number;
  strengths: string[];
  concerns: string[];
  interview_preparation_tips: string[];
}

export interface JobAnalysis {
  skill_gap_analysis: SkillGapAnalysis;
  recommendations: Recommendations;
  job_match_assessment: JobMatchAssessment;
  job_info: {
    title: string;
    company: string;
    location: string;
    apply_link: string;
    similarity_score: number;
  };
  analysis_error?: string;
}

export interface OverallReport {
  summary: {
    total_jobs_analyzed: number;
    average_match_percentage: string;
    most_common_missing_skills: string[];
    strongest_skills: string[];
  };
  recommendations: {
    top_skills_to_develop: string[];
    career_readiness: 'good' | 'needs_improvement' | 'significant_gaps';
    next_steps: string[];
  };
  job_analyses: JobAnalysis[];
}

export interface APIResponse<T = any> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Upload: undefined;
  Search: undefined;
  Analysis: undefined;
  Report: undefined;
  Profile: undefined;
};

// App State
export interface AppState {
  resumeProcessed: boolean;
  resumeInfo: ResumeInfo | null;
  resumeId: string | null;
  jobsFetched: boolean;
  jobsData: Job[];
  queryId: string | null;
  jobAnalyses: JobAnalysis[];
  overallReport: OverallReport | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLogin: string;
}