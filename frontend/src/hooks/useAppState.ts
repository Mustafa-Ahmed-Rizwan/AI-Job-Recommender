import { useState, useCallback } from 'react';
import type { ResumeInfo, Job, JobAnalysis, OverallReport, TabType } from '../types';

export interface AppState {
  currentTab: TabType;
  resumeProcessed: boolean;
  resumeInfo: ResumeInfo | null;
  resumeId: string | null;
  jobsFetched: boolean;
  jobsData: Job[];
  queryId: string | null;
  jobAnalyses: JobAnalysis[];
  overallReport: OverallReport | null;
  userProfile: any | null;
}

export const useAppState = () => {
  const [state, setState] = useState<AppState>({
    currentTab: 'upload',
    resumeProcessed: false,
    resumeInfo: null,
    resumeId: null,
    jobsFetched: false,
    jobsData: [],
    queryId: null,
    jobAnalyses: [],
    overallReport: null,
    userProfile: null,
  });

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    const userProfile = state.userProfile;
    setState({
      currentTab: 'upload',
      resumeProcessed: false,
      resumeInfo: null,
      resumeId: null,
      jobsFetched: false,
      jobsData: [],
      queryId: null,
      jobAnalyses: [],
      overallReport: null,
      userProfile,
    });
  }, [state.userProfile]);

  return { state, updateState, resetState };
};