// frontend/src/utils/helpers.ts
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

const detectSections = (text: string): string => {
  // Detect and properly format common job description sections
  return text
    .replace(/^(requirements?|qualifications?|responsibilities?|skills?|experience|benefits?|about|job description)/gim, '\n$1:')
    .replace(/what you'll do/gi, '\nResponsibilities:')
    .replace(/what we offer/gi, '\nBenefits:')
    .replace(/we are looking for/gi, '\nRequirements:');
};

export const formatJobDescription = (description: string): string => {
  if (!description || typeof description !== 'string') return '';
  
  
  // Step 1: Clean up the text
  let formatted = detectSections(description);
  formatted = formatted
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove multiple line breaks
    .replace(/\n+/g, '\n')
    // Trim each line
    .split('\n').map(line => line.trim()).join('\n')
    // Remove empty lines
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Step 2: Identify and format bullet points
  formatted = formatBulletPoints(formatted);
  
  // Step 3: Format sentences and paragraphs
  formatted = formatSentences(formatted);
  
  // Step 4: Add proper spacing
  formatted = addProperSpacing(formatted);
  
  return formatted;
};

const formatBulletPoints = (text: string): string => {
  // Common bullet point patterns
  const bulletPatterns = [
    /^[\s]*[•·▪▫◦‣⁃○●■□▸▹►▻]\s*/gm,  // Unicode bullets
    /^[\s]*\b(Requirements?|Responsibilities?|Qualifications?|Skills?)\b[\s]*:[\s]*/gim, // Section headers as bullets
    /^[\s]*[-*+]\s*/gm,        // Dash/asterisk bullets  
    /^[\s]*\d+[.)]\s*/gm,      // Numbered bullets
    /^[\s]*[a-zA-Z][.)]\s*/gm, // Letter bullets
    /^[\s]*>\s*/gm             // Greater than bullets
  ];
  
  let formatted = text;
  
  // Normalize all bullet patterns to a consistent format
  bulletPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, '• ');
  });
  
  // Ensure bullet points are on separate lines
  formatted = formatted.replace(/([^.\n])\s*•\s*/g, '$1\n• ');
  
  return formatted;
};

const formatSentences = (text: string): string => {
  // Split into sentences while preserving bullet points
  const lines = text.split('\n');
  const formattedLines = lines.map(line => {
    if (line.trim().startsWith('•')) {
      // Handle bullet points separately
      return formatBulletPoint(line);
    } else {
      // Format regular sentences
      return formatRegularText(line);
    }
  });
  
  return formattedLines.join('\n');
};

const formatBulletPoint = (line: string): string => {
  // Clean up bullet point text
  let cleaned = line.replace(/^[\s]*•[\s]*/, '• ');
  
  // Ensure proper capitalization
  if (cleaned.length > 2) {
    const content = cleaned.substring(2); // Remove "• "
    cleaned = '• ' + content.charAt(0).toUpperCase() + content.slice(1);
  }
  
  // Ensure it ends with proper punctuation
  if (cleaned.length > 3 && !/[.!?]$/.test(cleaned.trim())) {
    cleaned = cleaned.trim() + '.';
  }
  
  return cleaned;
};

const formatRegularText = (text: string): string => {
  if (!text.trim()) return text;
  
  // Split into sentences
  const sentences = text.split(/([.!?]+\s*)/).filter(s => s.trim());
  
  let formatted = '';
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i]?.trim();
    const punctuation = sentences[i + 1]?.trim() || '';
    
    if (sentence) {
      // Capitalize first letter
      const capitalizedSentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
      formatted += capitalizedSentence + punctuation + ' ';
    }
  }
  
  return formatted.trim();
};

const addProperSpacing = (text: string): string => {
  return text
    // Add spacing after bullet points
    .replace(/^(• .+)$/gm, '$1')
    // Add spacing between different sections
    .replace(/([.!?])\s*([A-Z][a-z]+:)/g, '$1\n\n$2')
    // Add spacing before requirements/qualifications sections
    .replace(/(Requirements?|Qualifications?|Skills?|Experience|Responsibilities?):/gi, '\n$1:')
    // Clean up excessive spacing
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// NEW: Create readable job description HTML
export const createReadableJobDescription = (description: string): string => {
  const formatted = formatJobDescription(description);
  const lines = formatted.split('\n');
  
  let html = '';
  let inBulletSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      if (inBulletSection) {
        html += '</ul>';
        inBulletSection = false;
      }
      html += '<br>';
      continue;
    }
    
    if (trimmedLine.startsWith('•')) {
      if (!inBulletSection) {
        html += '<ul class="job-description-list">';
        inBulletSection = true;
      }
      const bulletText = trimmedLine.substring(1).trim();
      html += `<li class="job-description-item">${bulletText}</li>`;
    } else {
      if (inBulletSection) {
        html += '</ul>';
        inBulletSection = false;
      }
      
      // Check if it's a section header
      if (/^[A-Z][a-zA-Z\s&,\-]+\s*:/.test(trimmedLine) || /^(Requirements?|Responsibilities?|Qualifications?|Skills?|Experience|Benefits?|About|Job Description|What [Yy]ou'll [Dd]o|What [Ww]e [Oo]ffer)\b.*:?/i.test(trimmedLine)) {
        html += `<h4 class="job-section-header">${trimmedLine}</h4>`;
      } else {
        html += `<p class="job-description-paragraph">${trimmedLine}</p>`;
      }
    }
  }
  
  if (inBulletSection) {
    html += '</ul>';
  }
  
  return html;
};

// Enhanced truncate with better word boundaries
export const smartTruncate = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  
  // Find the last space before the max length
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    // If we found a space reasonably close to the end, use it
    return truncated.substring(0, lastSpace) + '...';
  } else {
    // Otherwise, just truncate at max length
    return truncated + '...';
  }
};