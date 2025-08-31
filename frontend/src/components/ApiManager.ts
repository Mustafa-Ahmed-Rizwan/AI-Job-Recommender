import { apiService } from '../utils/api';
import { showToast } from './UIHelpers';

export const checkAPIStatus = async () => {
  const statusElement = document.getElementById('api-status');
  if (!statusElement) return;
  
  try {
    const isHealthy = await apiService.checkHealth();
    if (isHealthy) {
      statusElement.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        <span class="text-sm text-gray-600">Backend Connected</span>
      `;
    } else {
      throw new Error('API not responding');
    }
  } catch (error) {
    statusElement.innerHTML = `
      <div class="w-2 h-2 bg-red-500 rounded-full"></div>
      <span class="text-sm text-gray-600">Backend Disconnected</span>
    `;
    showToast('Backend API is not running. Please start the FastAPI server.', 'error');
  }
};