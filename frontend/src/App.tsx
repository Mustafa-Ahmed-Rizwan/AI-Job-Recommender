import React, { useState, useEffect } from 'react';
import { AuthSection } from './components/Auth/AuthSection';
import { Header } from './components/Layout/Header';
import { ProgressIndicator } from './components/Layout/ProgressIndicator';
import { ProfileModal } from './components/Modals/ProfileModal';
import { UpdateResumeModal } from './components/Modals/UpdateResumeModal';
import { ResumeUpload } from './components/Resume/ResumeUpload';
import { ResumeInfo } from './components/Resume/ResumeInfo';
import { JobSearch } from './components/Jobs/JobSearch';
import { JobSuggestions } from './components/Jobs/JobSuggestions';
import { JobResults } from './components/Jobs/JobResults';
import { AnalysisTab } from './components/Analysis/AnalysisTab';
import { ReportTab } from './components/Report/ReportTab';
import { useToast } from './components/Shared/Toast';
import { useAppState } from './hooks/useAppState';
import { authService } from './services/authService';
import { resumeService } from './services/resumeService';
import { apiService } from './utils/api';
import { Loader, CheckCircle } from 'lucide-react';
import type { ResumeInfo as ResumeInfoType, Job, JobAnalysis, OverallReport } from './types';

function App() {
  const { state, updateState, resetState } = useAppState();
  const { showToast, ToastContainer } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user, isNewSignUp) => {
      if (user && !isNewSignUp) {
        setIsAuthenticated(true);
        loadUserProfile();
      } else if (!user) {
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserProfile = async () => {
    try {
      const result = await apiService.getUserProfile();
      if (result.success && result.profile) {
        updateState({ userProfile: result.profile });

        if (result.profile.has_resume && result.profile.resume_info) {
          updateState({
            resumeInfo: result.profile.resume_info,
            resumeId: result.profile.resume_id || null,
            resumeProcessed: true,
            currentTab: 'search',
          });
          showToast('Welcome back! Your resume has been loaded. Ready to search jobs.');
        } else {
          updateState({ currentTab: 'upload' });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      updateState({ currentTab: 'upload' });
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.success) {
      showToast('Signed in successfully!');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleSignUp = async (email: string, password: string, displayName: string) => {
    const result = await authService.signUp(email, password, displayName);
    if (result.success) {
      showToast('Account created successfully! Please sign in to continue.');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleLogout = async () => {
    const result = await authService.logout();
    if (result.success) {
      showToast('Signed out successfully!');
      setIsAuthenticated(false);
      resetState();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 30;
      });
    }, 200);

    try {
      const result = await apiService.uploadResume(file);
      
      await resumeService.saveResume(result.resume_info, file.name);

      setUploadProgress(100);

      updateState({
        resumeInfo: result.resume_info,
        resumeId: result.resume_id,
        resumeProcessed: true,
      });

      if (state.userProfile) {
        updateState({
          userProfile: {
            ...state.userProfile,
            has_resume: true,
            resume_info: result.resume_info,
            resume_id: result.resume_id,
            last_updated: new Date().toISOString(),
          },
        });
      }

      setTimeout(() => {
        setIsUploading(false);
        updateState({ currentTab: 'search' });
        showToast('Resume processed successfully! Ready to search jobs.');
      }, 500);
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error processing resume. Please try again.',
        'error'
      );
    } finally {
      clearInterval(interval);
      setIsUploading(false);
    }
  };

  const handleUpdateResume = async (file: File) => {
    try {
      const result = await apiService.updateUserResume(file);

      updateState({
        resumeInfo: result.resume_info,
        resumeId: result.resume_id,
        resumeProcessed: true,
      });

      if (state.userProfile) {
        updateState({
          userProfile: {
            ...state.userProfile,
            has_resume: true,
            resume_info: result.resume_info,
            resume_id: result.resume_id,
            last_updated: new Date().toISOString(),
          },
        });
      }

      await resumeService.saveResume(result.resume_info, file.name);

      showToast('Resume updated successfully!');
      setIsUpdateModalOpen(false);
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error updating resume. Please try again.',
        'error'
      );
      throw error;
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm('Are you sure you want to delete your resume? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiService.deleteUserResume();

      if (result.success) {
        updateState({
          resumeInfo: null,
          resumeId: null,
          resumeProcessed: false,
          currentTab: 'upload',
        });

        if (state.userProfile) {
          updateState({
            userProfile: {
              ...state.userProfile,
              has_resume: false,
              resume_info: null,
              resume_id: null,
            },
          });
        }

        showToast('Resume deleted successfully!');
        setIsProfileModalOpen(false);
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error deleting resume. Please try again.',
        'error'
      );
    }
  };

  const handleJobSearch = async (query: string, location: string, numJobs: number) => {
    if (!state.resumeId) {
      showToast('Please upload your resume first.', 'error');
      return;
    }

    setSearchLoading(true);

    try {
      const searchResult = await apiService.searchJobs(query, location, numJobs);

      if (!searchResult.jobs || searchResult.jobs.length === 0) {
        showToast('No jobs found. Try different keywords or location.', 'warning');
        setSearchLoading(false);
        return;
      }

      const similarResult = await apiService.getSimilarJobs(
        state.resumeId,
        searchResult.query_id,
        searchResult.jobs.length
      );

      updateState({
        jobsData: similarResult.similar_jobs,
        queryId: searchResult.query_id,
        jobsFetched: true,
      });

      showToast(`Found ${similarResult.similar_jobs.length} matching jobs!`);
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error searching jobs. Please try again.',
        'error'
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGetSuggestions = async (): Promise<string[]> => {
    if (!state.resumeInfo) {
      showToast('Please upload your resume first.', 'warning');
      return [];
    }

    try {
      const result = await apiService.getSuggestedJobs(state.resumeInfo);
      showToast('Job suggestions generated!');
      return result.suggestions;
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error getting suggestions',
        'error'
      );
      return [];
    }
  };

  const handleStartAnalysis = async () => {
    if (!state.resumeId || !state.jobsData.length) {
      showToast('Please complete previous steps first.', 'error');
      return;
    }

    setAnalysisLoading(true);

    try {
      const jobsToAnalyze = state.jobsData.slice(0, 5).map((job) => ({
        ...job,
        company_name: job.company_name || job.company || '',
        company: job.company || job.company_name || '',
      }));

      const result = await apiService.analyzeSkills(state.resumeId, jobsToAnalyze);

      updateState({ jobAnalyses: result.analyses });

      showToast('Analysis completed successfully!');
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error during analysis. Please try again.',
        'error'
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGenerateReport = async (): Promise<OverallReport | null> => {
    if (!state.jobAnalyses.length) {
      showToast('Please complete the analysis first.', 'error');
      return null;
    }

    setReportLoading(true);

    try {
      const result = await apiService.generateReport(state.jobAnalyses);

      updateState({ overallReport: result.report });

      showToast('Report generated successfully!');
      return result.report;
    } catch (error: any) {
      showToast(
        error.response?.data?.detail || 'Error generating report. Please try again.',
        'error'
      );
      return null;
    } finally {
      setReportLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer />
        <AuthSection onSignIn={handleSignIn} onSignUp={handleSignUp} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />

      <Header
        userEmail={state.userProfile?.email}
        onProfileClick={() => setIsProfileModalOpen(true)}
        onLogoutClick={handleLogout}
      />

      <ProgressIndicator currentTab={state.currentTab} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Upload Tab */}
        {state.currentTab === 'upload' && (
          <div>
            {!state.resumeProcessed && !isUploading && <ResumeUpload onFileSelect={handleFileUpload} />}

            {isUploading && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-soft p-4 sm:p-8">
                  <div className="flex items-center space-x-3">
                    <Loader className="w-6 h-6 loading-spinner text-primary-600" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Processing resume...</span>
                        <span className="text-gray-500">Please wait</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {state.resumeProcessed && state.resumeInfo && (
              <div className="max-w-3xl mx-auto">
                {state.userProfile?.has_resume && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Resume uploaded successfully
                        </p>
                        <p className="text-xs text-green-600">Ready to search for jobs</p>
                      </div>
                    </div>
                  </div>
                )}
                <ResumeInfo
                  resumeInfo={state.resumeInfo}
                  onContinue={() => updateState({ currentTab: 'search' })}
                />
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {state.currentTab === 'search' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
                Find Relevant Jobs
              </h2>
              <p className="text-base sm:text-lg text-gray-600">
                Search for positions that match your profile
              </p>
            </div>

            <JobSearch onSearch={handleJobSearch} />

            {state.resumeInfo && (
              <JobSuggestions
                onGetSuggestions={handleGetSuggestions}
                onSelectSuggestion={(suggestion) => {
                  handleJobSearch(suggestion, 'Pakistan', 20);
                }}
              />
            )}

            <JobResults
              jobs={state.jobsData}
              loading={searchLoading}
              onContinue={() => updateState({ currentTab: 'analysis' })}
            />
          </div>
        )}

        {/* Analysis Tab */}
        {state.currentTab === 'analysis' && (
          <AnalysisTab
            onStartAnalysis={handleStartAnalysis}
            analyses={state.jobAnalyses}
            loading={analysisLoading}
            onContinue={() => updateState({ currentTab: 'report' })}
          />
        )}

        {/* Report Tab */}
        {state.currentTab === 'report' && (
          <ReportTab
            onGenerateReport={handleGenerateReport}
            report={state.overallReport}
            loading={reportLoading}
          />
        )}
      </main>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={state.userProfile}
        onUpdateResume={() => {
          setIsProfileModalOpen(false);
          setIsUpdateModalOpen(true);
        }}
        onDeleteResume={handleDeleteResume}
      />

      <UpdateResumeModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onUpload={handleUpdateResume}
      />
    </div>
  );
}

export default App;