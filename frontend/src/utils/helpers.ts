export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getMatchColor = (score: number): string => {
  if (score >= 0.8) return 'text-green-600 bg-green-50';
  if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
  return 'text-blue-600 bg-blue-50';
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

export const downloadJSON = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCSV = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateCSVReport = (report: any): string => {
  const lines = [
    'Metric,Value',
    `Jobs Analyzed,${report.summary?.total_jobs_analyzed || 0}`,
    `Average Match,${report.summary?.average_match_percentage || '0%'}`,
    `Career Readiness,${report.recommendations?.career_readiness || 'unknown'}`,
    '',
    'Missing Skills',
    ...(report.summary?.most_common_missing_skills || []).map((skill: string) => skill),
    '',
    'Strong Skills',
    ...(report.summary?.strongest_skills || []).map((skill: string) => skill),
  ];
  
  return lines.join('\n');
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

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};