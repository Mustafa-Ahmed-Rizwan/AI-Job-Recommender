import type { TabType } from '../types';
import { appState } from './AppState';

export const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type} slide-up`;
  
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'alert-triangle';
  const iconColor = type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-yellow-600';
  
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>
      <span class="text-sm font-medium text-gray-900">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-gray-400 hover:text-gray-600">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  
  document.getElementById('toast-container')?.appendChild(toast);
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
};

export const updateStepIndicator = (currentStep: TabType) => {
  const steps = ['search', 'analysis', 'report'];
  const currentIndex = steps.indexOf(currentStep);
  
  steps.forEach((step, index) => {
    const stepElement = document.getElementById(`step-${step}`);
    const circle = stepElement?.querySelector('div');
    const text = stepElement?.querySelector('span');
    
    if (stepElement && circle && text) {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium';
      text.className = 'text-sm';
      
      if (index < currentIndex) {
        circle.className += ' bg-green-600 text-white';
        text.className += ' text-green-600';
      } else if (index === currentIndex) {
        circle.className += ' bg-primary-600 text-white';
        text.className += ' text-primary-600 font-medium';
      } else {
        circle.className += ' bg-gray-200 text-gray-500';
        text.className += ' text-gray-500';
      }
    }
  });
};

export const showTab = (tabName: TabType) => {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });
  
  document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
  
  document.querySelectorAll('.tab-nav-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}-btn`)?.classList.add('active');
  
  appState.currentTab = tabName;
  updateStepIndicator(tabName);
};

export const toggleSection = (sectionName: string) => {
  const content = document.getElementById(`${sectionName}-content`);
  const chevron = document.getElementById(`${sectionName}-chevron`);
  
  if (content && chevron) {
    content.classList.toggle('hidden');
    chevron.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
  }
};

export const printReport = () => {
  window.print();
};