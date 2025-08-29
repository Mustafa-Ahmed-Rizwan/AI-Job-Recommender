// Helper utilities for the React Native app
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getMatchColor = (score: number): string => {
  if (score >= 0.8) return '#22c55e'; // green
  if (score >= 0.6) return '#eab308'; // yellow
  return '#3b82f6'; // blue
};

export const getMatchLabel = (score: number): string => {
  if (score >= 0.8) return 'Excellent Match';
  if (score >= 0.6) return 'Good Match';
  return 'Potential Match';
};

export const parseMatchPercentage = (percentage: string | number): number => {
  if (typeof percentage === 'number') return percentage;
  if (typeof percentage === 'string') {
    const num = parseFloat(percentage.replace('%', ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};