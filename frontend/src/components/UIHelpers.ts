import type { TabType } from '../types';
import { appState } from './AppState';
import { showErrorMessage, showSuccessMessage } from './ErrorManager';

export const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  if (type === 'success') {
    showSuccessMessage(message);
  } else {
    showErrorMessage(message);
  }
};

export const showTab = (tabType: TabType) => {
  // Hide all tabs
  const tabs = ['search', 'analysis', 'report'];
  tabs.forEach(tab => {
    const tabElement = document.getElementById(`tab-${tab}`);
    const tabButton = document.getElementById(`tab-${tab}-btn`);
    
    if (tabElement) {
      tabElement.classList.add('hidden');
    }
    
    if (tabButton) {
      tabButton.classList.remove('active');
      tabButton.className = 'tab-nav-button';
    }
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(`tab-${tabType}`);
  const selectedButton = document.getElementById(`tab-${tabType}-btn`);
  
  if (selectedTab) {
    selectedTab.classList.remove('hidden');
  }
  
  if (selectedButton) {
    selectedButton.classList.add('active');
    selectedButton.className = 'tab-nav-button active';
  }
  
  updateStepIndicator(tabType);
};

export const updateStepIndicator = (currentStep: TabType) => {
  const steps = {
    search: { element: 'step-search', number: 1 },
    analysis: { element: 'step-analysis', number: 2 },
    report: { element: 'step-report', number: 3 }
  };
  
  Object.entries(steps).forEach(([step, config]) => {
    const stepElement = document.getElementById(config.element);
    if (!stepElement) return;
    
    const circle = stepElement.querySelector('div');
    const text = stepElement.querySelector('span');
    
    if (step === currentStep) {
      // Current step
      circle?.classList.remove('bg-gray-200', 'text-gray-500');
      circle?.classList.add('bg-primary-600', 'text-white');
      text?.classList.remove('text-gray-500');
      text?.classList.add('text-primary-600', 'font-medium');
    } else if (config.number < steps[currentStep].number) {
      // Completed step
      circle?.classList.remove('bg-gray-200', 'text-gray-500');
      circle?.classList.add('bg-green-600', 'text-white');
      text?.classList.remove('text-gray-500');
      text?.classList.add('text-green-600', 'font-medium');
    } else {
      // Future step
      circle?.classList.remove('bg-primary-600', 'text-white', 'bg-green-600');
      circle?.classList.add('bg-gray-200', 'text-gray-500');
      text?.classList.remove('text-primary-600', 'text-green-600', 'font-medium');
      text?.classList.add('text-gray-500');
    }
  });
};

export const toggleSection = (sectionId: string) => {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.toggle('hidden');
  }
};

export const printReport = () => {
  const reportContent = document.getElementById('report-content');
  if (!reportContent) {
    showToast('No report to print.', 'error');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Please allow popups to print the report.', 'error');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Job Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .skill-tag { display: inline-block; background: #e5e7eb; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
        .hidden { display: none !important; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body>
      <h1>AI Job Recommender - Analysis Report</h1>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      ${reportContent.innerHTML}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
};