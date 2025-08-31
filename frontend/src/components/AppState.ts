import type { ResumeInfo, Job, JobAnalysis, OverallReport, TabType } from '../types';

export class AppState {
  currentTab: TabType = 'search';
  profileCompleted: boolean = false;
  resumeInfo: ResumeInfo | null = null;
  resumeId: string | null = null;
  jobsFetched: boolean = false;
  jobsData: Job[] = [];
  queryId: string | null = null;
  jobAnalyses: JobAnalysis[] = [];
  overallReport: OverallReport | null = null;

  reset() {
    this.currentTab = 'search';
    this.profileCompleted = false;
    this.resumeInfo = null;
    this.resumeId = null;
    this.jobsFetched = false;
    this.jobsData = [];
    this.queryId = null;
    this.jobAnalyses = [];
    this.overallReport = null;
  }
}

export const appState = new AppState();