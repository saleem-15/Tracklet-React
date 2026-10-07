/**
 * Tailored CV Metadata, Validation and Formatting Utilities
 * Single source of truth for resume validation across web app and extension.
 */

export const MAX_RESUME_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/octet-stream'
];

/**
 * Format file size in bytes to human-readable string (B, KB, MB).
 */
export function formatResumeFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

/**
 * Sanitize resume file name for safe storage and display.
 */
export function sanitizeResumeFileName(fileName: string | null | undefined): string {
  if (!fileName || typeof fileName !== 'string') return 'resume.pdf';
  let clean = fileName.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ');
  if (clean.length > 120) {
    const extMatch = clean.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';
    clean = clean.slice(0, 120 - ext.length) + ext;
  }
  return clean || 'resume.pdf';
}

export interface ResumeValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  formattedSize?: string;
}

/**
 * Validate resume file for size, type, and integrity.
 */
export function validateResumeFile(file: { name?: string; size?: number; type?: string } | null | undefined): ResumeValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const name = file.name || 'resume.pdf';
  const size = typeof file.size === 'number' ? file.size : 0;
  const sanitizedName = sanitizeResumeFileName(name);

  if (size <= 0) {
    return { valid: false, error: 'Selected file is empty (0 bytes).' };
  }

  if (size > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${formatResumeFileSize(size)}) exceeds maximum limit of 2 MB.`
    };
  }

  const extMatch = sanitizedName.toLowerCase().match(/\.[a-z0-9]+$/);
  const ext = extMatch ? extMatch[0] : '';
  if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type (${ext || 'unknown'}). Please upload a PDF, DOCX, DOC, or TXT file.`
    };
  }

  return {
    valid: true,
    sanitizedName,
    formattedSize: formatResumeFileSize(size)
  };
}
