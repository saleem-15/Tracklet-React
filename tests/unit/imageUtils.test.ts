import { describe, it, expect } from 'vitest';
import { 
  validateImageFile, 
  formatFileSize, 
  extractImageFromClipboard, 
  MAX_ATTACHMENT_SIZE_BYTES 
} from '../../src/lib/imageUtils';

describe('imageUtils', () => {
  describe('formatFileSize', () => {
    it('formats bytes, kilobytes, and megabytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(150 * 1024)).toBe('150 KB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });
  });

  describe('validateImageFile', () => {
    it('validates supported image types within size limit', () => {
      const pngFile = new File(['mock content'], 'test.png', { type: 'image/png' });
      const jpgFile = new File(['mock content'], 'photo.jpg', { type: 'image/jpeg' });
      const webpFile = new File(['mock content'], 'card.webp', { type: 'image/webp' });

      expect(validateImageFile(pngFile).isValid).toBe(true);
      expect(validateImageFile(jpgFile).isValid).toBe(true);
      expect(validateImageFile(webpFile).isValid).toBe(true);
    });

    it('rejects unsupported file formats like pdf or text', () => {
      const pdfFile = new File(['pdf data'], 'doc.pdf', { type: 'application/pdf' });
      const res = validateImageFile(pdfFile);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unsupported format');
    });

    it('rejects files larger than 2MB', () => {
      // Mock large file by overriding size getter
      const largeFile = new File([''], 'big.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: MAX_ATTACHMENT_SIZE_BYTES + 1024 });

      const res = validateImageFile(largeFile);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('File is too large');
    });

    it('handles null or missing file', () => {
      expect(validateImageFile(null as unknown as File).isValid).toBe(false);
    });
  });

  describe('extractImageFromClipboard', () => {
    it('extracts image from clipboard event when present', () => {
      const mockImageFile = new File(['fake image bytes'], 'snippet.png', { type: 'image/png' });
      const mockEvent = {
        clipboardData: {
          items: [
            {
              type: 'text/plain',
              getAsFile: () => null,
            },
            {
              type: 'image/png',
              getAsFile: () => mockImageFile,
            },
          ],
        },
      } as unknown as ClipboardEvent;

      const extracted = extractImageFromClipboard(mockEvent);
      expect(extracted).not.toBeNull();
      expect(extracted?.type).toBe('image/png');
    });

    it('returns null when clipboard only contains text', () => {
      const mockEvent = {
        clipboardData: {
          items: [
            {
              type: 'text/plain',
              getAsFile: () => null,
            },
          ],
        },
      } as unknown as ClipboardEvent;

      expect(extractImageFromClipboard(mockEvent)).toBeNull();
    });
  });
});
